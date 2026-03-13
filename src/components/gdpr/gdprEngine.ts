// ============================================================
// GDPR TRIAGE ENGINE
// Implements the pseudocode decision tree with accumulated state.
// ============================================================

export type RiskLevel = 'LOW' | 'MED' | 'HIGH' | 'CRITICAL'
export type PrincipleStatus = 'PASS' | 'FAIL' | 'UNKNOWN'

export interface EngineQuestion {
  id: string
  module: string
  moduleIndex: number   // 0-based, used for progress display
  moduleLabel: string
  text: string
  help?: string
  multi: boolean
  options: { value: string; label: string }[]
}

export interface TriageAnswers {
  [questionId: string]: string | string[]
}

export interface TriageResult {
  gdpr_applicable: boolean | 'unknown'
  risk_level: RiskLevel
  principle_flags: Record<string, PrincipleStatus>
  likely_articles: string[]
  case_tags: string[]
  next_actions: string[]
  verdict_title: string
  verdict_summary: string
}

// ============================================================
// HELPERS
// ============================================================

export function ans(answers: TriageAnswers, id: string): string {
  const v = answers[id]
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '')
}

export function ansArr(answers: TriageAnswers, id: string): string[] {
  const v = answers[id]
  return Array.isArray(v) ? v : v ? [v] : []
}

function isAnswered(answers: TriageAnswers, id: string): boolean {
  const v = answers[id]
  if (v === undefined || v === null) return false
  if (Array.isArray(v)) return v.length > 0
  return v !== ''
}

function shouldTerminateEarly(answers: TriageAnswers): boolean {
  const pd1 = ans(answers, 'pd_1')
  if (pd1 === 'NO') return true

  if (pd1 === 'UNSURE') {
    const pd2 = ans(answers, 'pd_2')
    if (pd2 === 'NO') {
      const pd3 = ans(answers, 'pd_3')
      if (pd3 === 'NO') return true
    }
  }

  if (isAnswered(answers, 'id_1') && ans(answers, 'id_1') === 'NO') return true

  if (ans(answers, 'ctx_location') === 'OUTSIDE_EU' && isAnswered(answers, 'ter_1') && ans(answers, 'ter_1') === 'NO') return true

  return false
}

// Whether GDPR scope is still uncertain or confirmed
function gdprActive(answers: TriageAnswers): boolean {
  return !shouldTerminateEarly(answers)
}

// ============================================================
// QUESTION DEFINITIONS (ordered as in the pseudocode)
// ============================================================
type QuestionDef = EngineQuestion & { shouldAsk: (a: TriageAnswers) => boolean }

const QUESTIONS: QuestionDef[] = [
  // ──────────────────────────────────────────────
  // MODULE 0 — Personal Data Identification (Art. 4)
  // ──────────────────────────────────────────────
  {
    id: 'pd_1', module: 'PERSONAL_DATA', moduleIndex: 0, moduleLabel: 'Personal Data',
    text: 'Does this situation involve personal data?',
    help: 'Personal data is any information that can identify a living person — directly (name, photo) or indirectly (IP address, device ID, location).',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — it clearly involves personal data' },
      { value: 'NO', label: 'No — it does not involve personal data' },
      { value: 'UNSURE', label: "I'm not sure" },
    ],
    shouldAsk: () => true,
  },
  {
    id: 'pd_2', module: 'PERSONAL_DATA', moduleIndex: 0, moduleLabel: 'Personal Data',
    text: 'Does the data include identifiers such as name, email, IP address, face image, voice, location, or online ID?',
    help: 'Even indirect identifiers count as personal data if they can reasonably be used to single out a person.',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — identifiers are present' },
      { value: 'NO', label: 'No clear identifiers' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => ans(a, 'pd_1') === 'UNSURE',
  },
  {
    id: 'pd_3', module: 'PERSONAL_DATA', moduleIndex: 0, moduleLabel: 'Personal Data',
    text: 'Could this data be combined with other reasonably available data to identify someone?',
    help: 'Re-identification risk is relevant even without direct identifiers. Courts consider reasonable effort and available means.',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — re-identification is possible' },
      { value: 'NO', label: 'No — identification is not reasonably possible' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => ans(a, 'pd_1') === 'UNSURE' && ans(a, 'pd_2') === 'NO',
  },

  // ──────────────────────────────────────────────
  // MODULE 1 — Identifiability
  // ──────────────────────────────────────────────
  {
    id: 'id_1', module: 'IDENTIFIABILITY', moduleIndex: 1, moduleLabel: 'Identifiability',
    text: 'How does the data identify the person?',
    multi: false,
    options: [
      { value: 'DIRECT', label: 'Directly — name, ID number, photo, etc.' },
      { value: 'INDIRECT', label: 'Indirectly — combination of attributes' },
      { value: 'NO', label: 'It does not actually identify anyone' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => {
      if (!isAnswered(a, 'pd_1')) return false
      const pd1 = ans(a, 'pd_1')
      if (pd1 === 'YES') return true
      if (pd1 === 'NO') return false
      // UNSURE path
      if (!isAnswered(a, 'pd_2')) return false
      const pd2 = ans(a, 'pd_2')
      if (pd2 === 'YES') return true
      if (pd2 === 'UNSURE') return true
      // pd2 === NO: need pd_3
      if (!isAnswered(a, 'pd_3')) return false
      return ans(a, 'pd_3') === 'YES'
    },
  },

  // ──────────────────────────────────────────────
  // MODULE 2 — Context Trunk
  // ──────────────────────────────────────────────
  {
    id: 'ctx_format', module: 'CONTEXT', moduleIndex: 2, moduleLabel: 'Context',
    text: 'What is the main format of the data involved?',
    multi: false,
    options: [
      { value: 'TEXT', label: 'Text — documents, emails, messages, forms' },
      { value: 'IMAGE', label: 'Images / photos' },
      { value: 'VIDEO', label: 'Video footage' },
      { value: 'AUDIO', label: 'Audio recordings' },
      { value: 'STRUCTURED', label: 'Structured data — databases, spreadsheets, logs' },
      { value: 'METADATA', label: 'Metadata — IP, cookies, device IDs, location' },
      { value: 'MIXED', label: 'Multiple formats' },
    ],
    shouldAsk: (a) => gdprActive(a) && isAnswered(a, 'id_1'),
  },
  {
    id: 'ctx_actor', module: 'CONTEXT', moduleIndex: 2, moduleLabel: 'Context',
    text: 'Who processed or used the data?',
    multi: false,
    options: [
      { value: 'STATE', label: 'A government body or public authority' },
      { value: 'COMPANY', label: 'A private company' },
      { value: 'PLATFORM', label: 'An online platform or tech service' },
      { value: 'PROFESSIONAL', label: 'A professional — doctor, lawyer, accountant…' },
      { value: 'EMPLOYER', label: 'My employer' },
      { value: 'PERSON', label: 'A private individual' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => isAnswered(a, 'ctx_format'),
  },
  {
    id: 'ctx_location', module: 'CONTEXT', moduleIndex: 2, moduleLabel: 'Context',
    text: 'Where did the data processing take place?',
    multi: false,
    options: [
      { value: 'EU', label: 'In the EU / EEA' },
      { value: 'OUTSIDE_EU_EU_EFFECTS', label: 'Outside the EU, but targeting or monitoring EU residents' },
      { value: 'OUTSIDE_EU', label: 'Outside the EU — no clear EU connection' },
      { value: 'UNSURE', label: 'Unsure / unclear' },
    ],
    shouldAsk: (a) => isAnswered(a, 'ctx_actor'),
  },
  {
    id: 'ctx_action', module: 'CONTEXT', moduleIndex: 2, moduleLabel: 'Context',
    text: 'What was the main action taken with your data?',
    multi: false,
    options: [
      { value: 'COLLECTION', label: 'Collection or gathering' },
      { value: 'STORAGE', label: 'Storage or retention' },
      { value: 'INTERNAL_USE', label: 'Internal use within the organisation' },
      { value: 'COMMUNICATION', label: 'Sharing with specific third parties' },
      { value: 'PUBLICATION', label: 'Public disclosure or publication' },
      { value: 'SALE_TRANSFER', label: 'Sale or commercial transfer' },
      { value: 'INTL_TRANSFER', label: 'International transfer (outside EU/EEA)' },
      { value: 'INCORRECT_DELETION', label: 'Incorrect or incomplete deletion' },
      { value: 'UNAUTHORIZED_ACCESS', label: 'Unauthorised access or data leak' },
      { value: 'PROFILING', label: 'Profiling or automated decision-making' },
    ],
    shouldAsk: (a) => isAnswered(a, 'ctx_location'),
  },
  {
    id: 'ctx_purpose', module: 'CONTEXT', moduleIndex: 2, moduleLabel: 'Context',
    text: 'What was the stated purpose of the processing?',
    multi: false,
    options: [
      { value: 'SERVICE', label: 'Providing a service or product' },
      { value: 'LEGAL_OBLIGATION', label: 'Legal or regulatory obligation' },
      { value: 'MARKETING', label: 'Direct marketing or advertising' },
      { value: 'SECURITY', label: 'Security or fraud prevention' },
      { value: 'RESEARCH', label: 'Research or analysis' },
      { value: 'STATISTICS', label: 'Statistical purposes' },
      { value: 'HEALTH', label: 'Healthcare or public health' },
      { value: 'JUSTICE', label: 'Legal proceedings or justice' },
      { value: 'OTHER', label: 'Other purpose' },
      { value: 'UNSURE', label: 'No purpose was stated / I do not know' },
    ],
    shouldAsk: (a) => isAnswered(a, 'ctx_action'),
  },

  // ──────────────────────────────────────────────
  // MODULE 3 — Territorial Scope (Art. 3)
  // ──────────────────────────────────────────────
  {
    id: 'ter_1', module: 'TERRITORIAL', moduleIndex: 3, moduleLabel: 'Territorial Scope',
    text: 'Does the organisation offer goods/services to EU residents, or monitor their behaviour?',
    help: 'Under GDPR Art. 3(2), organisations outside the EU must comply if they target or monitor EU residents.',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — it targets or monitors EU residents' },
      { value: 'NO', label: 'No — no connection to the EU' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => ans(a, 'ctx_location') === 'OUTSIDE_EU',
  },

  // ──────────────────────────────────────────────
  // MODULE 4 — Lawful Basis (Art. 6 — full)
  // ──────────────────────────────────────────────
  {
    id: 'lb_main', module: 'LAWFUL_BASIS', moduleIndex: 4, moduleLabel: 'Lawful Basis',
    text: 'Under which legal basis was the data processed? (Art. 6 GDPR)',
    help: 'Every processing activity needs one of these six bases. If not communicated to you, select "Unknown".',
    multi: false,
    options: [
      { value: 'CONSENT', label: 'Consent — you gave explicit permission' },
      { value: 'CONTRACT', label: 'Contract — necessary for a contract you are party to' },
      { value: 'LEGAL_OBLIGATION', label: 'Legal obligation — required by law' },
      { value: 'VITAL_INTERESTS', label: 'Vital interests — to protect life' },
      { value: 'PUBLIC_TASK', label: 'Public task or official authority' },
      { value: 'LEGITIMATE_INTERESTS', label: "Legitimate interests — the controller's or a third party's" },
      { value: 'UNSURE', label: 'Unknown — I was not informed' },
    ],
    shouldAsk: (a) => gdprActive(a) && isAnswered(a, 'ctx_purpose'),
  },

  // Consent sub-questions (Art. 6(1)(a) + Art. 7)
  {
    id: 'lb_a_1', module: 'LAWFUL_BASIS', moduleIndex: 4, moduleLabel: 'Lawful Basis — Consent',
    text: 'Was the consent freely given, without pressure or conditioning on a service?',
    help: 'Consent tied to service access, or given under power imbalance (e.g. employer–employee), is not free.',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — freely given' },
      { value: 'NO', label: 'No — conditioned or coerced' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => ans(a, 'lb_main') === 'CONSENT',
  },
  {
    id: 'lb_a_2', module: 'LAWFUL_BASIS', moduleIndex: 4, moduleLabel: 'Lawful Basis — Consent',
    text: 'Was consent specific to clearly defined purposes — not generic or bundled?',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — specific purposes were stated' },
      { value: 'NO', label: 'No — generic or bundled consent' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => ans(a, 'lb_main') === 'CONSENT',
  },
  {
    id: 'lb_a_3', module: 'LAWFUL_BASIS', moduleIndex: 4, moduleLabel: 'Lawful Basis — Consent',
    text: 'Were you fully informed before giving consent?',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — clear information provided' },
      { value: 'NO', label: 'No — information was missing or unclear' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => ans(a, 'lb_main') === 'CONSENT',
  },
  {
    id: 'lb_a_4', module: 'LAWFUL_BASIS', moduleIndex: 4, moduleLabel: 'Lawful Basis — Consent',
    text: 'Was consent given via a clear affirmative action — not a pre-ticked box or silence?',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — active, unambiguous action required' },
      { value: 'NO', label: 'No — pre-ticked box or inaction counted as consent' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => ans(a, 'lb_main') === 'CONSENT',
  },
  {
    id: 'lb_a_5', module: 'LAWFUL_BASIS', moduleIndex: 4, moduleLabel: 'Lawful Basis — Consent',
    text: 'Could you withdraw consent as easily as you gave it?',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — withdrawal was simple and available' },
      { value: 'NO', label: 'No — withdrawal was difficult or impossible' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => ans(a, 'lb_main') === 'CONSENT',
  },

  // Contract sub-questions (Art. 6(1)(b))
  {
    id: 'lb_b_1', module: 'LAWFUL_BASIS', moduleIndex: 4, moduleLabel: 'Lawful Basis — Contract',
    text: 'Was the processing strictly necessary to perform the contract or pre-contractual steps you requested?',
    help: '"Necessary" is strict: the processing must be objectively required, not merely convenient or efficient.',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — strictly necessary' },
      { value: 'NO', label: 'No — went beyond what the contract required' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => ans(a, 'lb_main') === 'CONTRACT',
  },
  {
    id: 'lb_b_2', module: 'LAWFUL_BASIS', moduleIndex: 4, moduleLabel: 'Lawful Basis — Contract',
    text: 'Were additional data processed beyond what was contractually necessary — for example for marketing?',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — additional data were processed' },
      { value: 'NO', label: 'No — only necessary data' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => ans(a, 'lb_main') === 'CONTRACT',
  },

  // Legal obligation sub-questions (Art. 6(1)(c))
  {
    id: 'lb_c_1', module: 'LAWFUL_BASIS', moduleIndex: 4, moduleLabel: 'Lawful Basis — Legal Obligation',
    text: 'Does the legal obligation arise from EU law or Member State law?',
    multi: false,
    options: [
      { value: 'EU_LAW', label: 'EU law — regulation or directive' },
      { value: 'MEMBER_STATE_LAW', label: 'Member State / national law' },
      { value: 'UNSURE', label: 'Unsure or unclear' },
    ],
    shouldAsk: (a) => ans(a, 'lb_main') === 'LEGAL_OBLIGATION',
  },
  {
    id: 'lb_c_2', module: 'LAWFUL_BASIS', moduleIndex: 4, moduleLabel: 'Lawful Basis — Legal Obligation',
    text: 'Was the processing proportionate — did it not exceed what the legal obligation actually required?',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — proportionate' },
      { value: 'NO', label: 'No — it exceeded the obligation' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => ans(a, 'lb_main') === 'LEGAL_OBLIGATION',
  },

  // Vital interests (Art. 6(1)(d))
  {
    id: 'lb_d_1', module: 'LAWFUL_BASIS', moduleIndex: 4, moduleLabel: 'Lawful Basis — Vital Interests',
    text: 'Was there a genuine, immediate risk to someone\'s life or physical integrity?',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — a real risk to life or physical safety' },
      { value: 'NO', label: 'No — the risk was not that serious' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => ans(a, 'lb_main') === 'VITAL_INTERESTS',
  },

  // Public task (Art. 6(1)(e))
  {
    id: 'lb_e_1', module: 'LAWFUL_BASIS', moduleIndex: 4, moduleLabel: 'Lawful Basis — Public Task',
    text: 'Was the processing proportionate to the public interest goal, and based on Union or Member State law?',
    help: 'Art. 6(3) requires the purpose to be determined by law, and the processing to be necessary and proportionate.',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — proportionate and legally grounded' },
      { value: 'NO', label: 'No — disproportionate or lacks legal basis' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => ans(a, 'lb_main') === 'PUBLIC_TASK',
  },

  // Legitimate interests (Art. 6(1)(f))
  {
    id: 'lb_f_1', module: 'LAWFUL_BASIS', moduleIndex: 4, moduleLabel: 'Lawful Basis — Legitimate Interests',
    text: 'Were you informed of the legitimate interest being relied on and your right to object?',
    help: 'Arts. 13–14 require this information at the time of collection.',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — I was informed' },
      { value: 'NO', label: 'No — not informed' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => ans(a, 'lb_main') === 'LEGITIMATE_INTERESTS',
  },
  {
    id: 'lb_f_2', module: 'LAWFUL_BASIS', moduleIndex: 4, moduleLabel: 'Lawful Basis — Legitimate Interests',
    text: "Does this processing involve children's data?",
    help: "Legitimate interests requires heightened scrutiny when children's data is involved.",
    multi: false,
    options: [
      { value: 'YES', label: "Yes — children's data is involved" },
      { value: 'NO', label: 'No' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => ans(a, 'lb_main') === 'LEGITIMATE_INTERESTS',
  },
  {
    id: 'lb_f_3', module: 'LAWFUL_BASIS', moduleIndex: 4, moduleLabel: 'Lawful Basis — Legitimate Interests',
    text: "Do your rights or interests override the organisation's legitimate interest?",
    help: 'The controller must balance their interest against your fundamental rights. If your interests prevail, this basis fails.',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — my interests prevail' },
      { value: 'NO', label: "No — the organisation's interest is clearly justified" },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => ans(a, 'lb_main') === 'LEGITIMATE_INTERESTS',
  },

  // ──────────────────────────────────────────────
  // MODULE 5 — Art. 5 Principles
  // ──────────────────────────────────────────────
  {
    id: 'p_transparency', module: 'ART5', moduleIndex: 5, moduleLabel: 'GDPR Principles',
    text: 'Were you given clear information about the processing — purpose, legal basis, recipients, retention period, and your rights?',
    help: 'Arts. 13–14 require this at the time of data collection. "Clear" means understandable, not buried in legalese.',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — full and clear information was provided' },
      { value: 'PARTIAL', label: 'Partial — some information was missing or unclear' },
      { value: 'NO', label: 'No — no meaningful information was provided' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => gdprActive(a) && isAnswered(a, 'lb_main'),
  },
  {
    id: 'p_fairness', module: 'ART5', moduleIndex: 5, moduleLabel: 'GDPR Principles',
    text: 'Was the processing reasonably expected given your relationship with the organisation, or were there deceptive/manipulative practices?',
    help: 'Art. 5(1)(a) fairness: unexpected, covert, or manipulative processing (dark patterns) fails this test.',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — predictable and fair' },
      { value: 'NO', label: 'No — unexpected, covert, or manipulative' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => isAnswered(a, 'p_transparency'),
  },
  {
    id: 'p_purpose_change', module: 'ART5', moduleIndex: 5, moduleLabel: 'GDPR Principles',
    text: 'Was your data used for a different purpose than originally stated or agreed?',
    help: 'Art. 5(1)(b): further processing for a new purpose requires compatibility, consent, or a legal basis.',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — used for a different, undisclosed purpose' },
      { value: 'NO', label: 'No — used only for the original purpose' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => isAnswered(a, 'p_fairness'),
  },
  {
    id: 'p_minimisation', module: 'ART5', moduleIndex: 5, moduleLabel: 'GDPR Principles',
    text: 'Was only data that was strictly necessary for the purpose collected and processed?',
    help: 'Art. 5(1)(c): data must be "adequate, relevant and limited to what is necessary".',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — only necessary data' },
      { value: 'NO', label: 'No — more data than necessary was processed' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => isAnswered(a, 'p_purpose_change'),
  },
  {
    id: 'p_accuracy', module: 'ART5', moduleIndex: 5, moduleLabel: 'GDPR Principles',
    text: 'Was your personal data accurate and kept up to date?',
    help: 'Art. 5(1)(d): inaccurate data must be erased or rectified without delay.',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — data was accurate' },
      { value: 'NO', label: 'No — inaccurate and not corrected' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => isAnswered(a, 'p_minimisation'),
  },
  {
    id: 'p_storage', module: 'ART5', moduleIndex: 5, moduleLabel: 'GDPR Principles',
    text: 'Was your data kept longer than necessary, or without a defined retention period?',
    help: 'Art. 5(1)(e): data must be kept "no longer than is necessary for the purposes".',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — kept too long or indefinitely' },
      { value: 'NO', label: 'No — limited retention and communicated' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => isAnswered(a, 'p_accuracy'),
  },

  // ──────────────────────────────────────────────
  // MODULE 6 — Special Categories (Arts. 9–10)
  // ──────────────────────────────────────────────
  {
    id: 'sc_1', module: 'SPECIAL_CATEGORIES', moduleIndex: 6, moduleLabel: 'Sensitive Data',
    text: 'Does the situation involve any of these sensitive data categories?',
    help: 'Art. 9 data requires explicit consent or a specific exception. Art. 10 (criminal) data may only be processed under official authority.',
    multi: true,
    options: [
      { value: 'HEALTH', label: 'Health or medical data' },
      { value: 'BIOMETRIC', label: 'Biometric data — fingerprints, face recognition' },
      { value: 'IDEOLOGY', label: 'Political opinions or ideology' },
      { value: 'RELIGION', label: 'Religious or philosophical beliefs' },
      { value: 'SEXUAL_LIFE', label: 'Sexual orientation or life' },
      { value: 'TRADE_UNION', label: 'Trade union membership' },
      { value: 'CHILDREN', label: "Children's data (under 16)" },
      { value: 'CRIMINAL', label: 'Criminal convictions or offences (Art. 10)' },
      { value: 'NONE', label: 'None of the above' },
    ],
    shouldAsk: (a) => gdprActive(a) && isAnswered(a, 'p_storage'),
  },

  // ──────────────────────────────────────────────
  // MODULE 7 — Rights (Arts. 12–22)
  // ──────────────────────────────────────────────
  {
    id: 'rights_1', module: 'RIGHTS', moduleIndex: 7, moduleLabel: 'Your Rights',
    text: 'Have you tried to exercise any GDPR rights with the organisation?',
    multi: true,
    options: [
      { value: 'ACCESS', label: 'Right of access (Art. 15) — requested a copy of your data' },
      { value: 'RECTIFICATION', label: 'Rectification (Art. 16) — asked to correct inaccurate data' },
      { value: 'ERASURE', label: 'Erasure / right to be forgotten (Art. 17)' },
      { value: 'OBJECTION', label: 'Objection to processing (Art. 21)' },
      { value: 'RESTRICTION', label: 'Restriction of processing (Art. 18)' },
      { value: 'PORTABILITY', label: 'Data portability (Art. 20)' },
      { value: 'NONE', label: "No — I haven't exercised any rights yet" },
    ],
    shouldAsk: (a) => isAnswered(a, 'sc_1'),
  },
  {
    id: 'rights_2', module: 'RIGHTS', moduleIndex: 7, moduleLabel: 'Your Rights',
    text: 'How did the organisation respond to your rights request?',
    help: 'Organisations must respond within 30 days (extendable to 90 days for complex requests, with prior notice).',
    multi: false,
    options: [
      { value: 'ON_TIME', label: 'Responded fully and on time (within 30 days)' },
      { value: 'LATE', label: 'Responded but outside the 30-day window' },
      { value: 'PARTIAL', label: 'Partially fulfilled — incomplete response' },
      { value: 'NO_RESPONSE', label: 'No response at all' },
      { value: 'UNJUSTIFIED_REFUSAL', label: 'Refused without a valid GDPR justification' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => {
      const r = ansArr(a, 'rights_1')
      return r.length > 0 && !r.includes('NONE')
    },
  },

  // ──────────────────────────────────────────────
  // MODULE 8 — Security / Breach (Arts. 32–34)
  // ──────────────────────────────────────────────
  {
    id: 'breach_1', module: 'BREACH', moduleIndex: 8, moduleLabel: 'Security & Breach',
    text: 'Was there a security breach involving your data?',
    help: 'A breach includes accidental or unlawful destruction, loss, alteration, unauthorised disclosure, or access to personal data.',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — there was a breach' },
      { value: 'NO', label: 'No known breach' },
      { value: 'UNSURE', label: 'Unsure — possibly' },
    ],
    shouldAsk: (a) => isAnswered(a, 'rights_1'),
  },
  {
    id: 'breach_2', module: 'BREACH', moduleIndex: 8, moduleLabel: 'Security & Breach',
    text: 'What type of breach occurred?',
    multi: true,
    options: [
      { value: 'UNAUTHORIZED_ACCESS', label: 'Unauthorised external access' },
      { value: 'LOSS', label: 'Loss of data or devices' },
      { value: 'THEFT', label: 'Theft of devices or files' },
      { value: 'PUBLICATION', label: 'Accidental public disclosure' },
      { value: 'HACKING', label: 'Cyberattack or hacking' },
      { value: 'INTERNAL', label: 'Insider access or internal misuse' },
      { value: 'OTHER', label: 'Other type' },
    ],
    shouldAsk: (a) => ans(a, 'breach_1') === 'YES',
  },
  {
    id: 'breach_3', module: 'BREACH', moduleIndex: 8, moduleLabel: 'Security & Breach',
    text: 'Were you notified about the breach by the organisation?',
    help: 'Art. 34: notification to individuals is required when the breach is likely to result in a high risk to their rights and freedoms.',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — notified with clear information' },
      { value: 'PARTIAL', label: 'Partial — vague or incomplete notification' },
      { value: 'NO', label: 'No — not notified at all' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => ['YES', 'UNSURE'].includes(ans(a, 'breach_1')),
  },

  // ──────────────────────────────────────────────
  // MODULE 9 — Profiling / Automated Decisions (Art. 22)
  // ──────────────────────────────────────────────
  {
    id: 'prof_1', module: 'PROFILING', moduleIndex: 9, moduleLabel: 'Profiling',
    text: 'Was your data used for profiling, scoring, or behavioural targeting?',
    help: 'Profiling means automated processing to evaluate aspects of personality, interests, behaviour, location, etc.',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes' },
      { value: 'NO', label: 'No' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => isAnswered(a, 'breach_1'),
  },
  {
    id: 'prof_2', module: 'PROFILING', moduleIndex: 9, moduleLabel: 'Profiling',
    text: 'Did an automated decision produce legal or similarly significant effects on you?',
    help: 'Examples: automated credit scoring, job rejection, insurance pricing, or benefits denial with no human review.',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — legal or significant effects' },
      { value: 'NO', label: 'No — no significant decision outcome' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => ans(a, 'prof_1') === 'YES',
  },
  {
    id: 'prof_3', module: 'PROFILING', moduleIndex: 9, moduleLabel: 'Profiling',
    text: 'Was there meaningful human review before the decision took effect?',
    help: 'Art. 22 gives you the right to human intervention, to express your point of view, and to contest the decision.',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — a human could review and override' },
      { value: 'NO', label: 'No — fully automated with no human involvement' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => ans(a, 'prof_2') === 'YES',
  },

  // ──────────────────────────────────────────────
  // MODULE 10 — International Transfers (Chapter V)
  // ──────────────────────────────────────────────
  {
    id: 'tr_1', module: 'TRANSFERS', moduleIndex: 10, moduleLabel: 'International Transfers',
    text: 'Was your data transferred to countries outside the EU/EEA?',
    help: 'Chapter V of GDPR: transfers outside the EU require an adequacy decision, SCCs, BCRs, or another safeguard.',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes' },
      { value: 'NO', label: 'No' },
      { value: 'UNSURE', label: 'Unsure — possibly' },
    ],
    shouldAsk: (a) => isAnswered(a, 'prof_1'),
  },
  {
    id: 'tr_2', module: 'TRANSFERS', moduleIndex: 10, moduleLabel: 'International Transfers',
    text: 'What safeguard was used to protect the international transfer?',
    help: 'Without a safeguard, the transfer is unlawful under Art. 44.',
    multi: false,
    options: [
      { value: 'ADEQUACY', label: 'Adequacy decision — e.g. EU–UK, Switzerland' },
      { value: 'SCC', label: 'Standard Contractual Clauses (SCCs)' },
      { value: 'BCR', label: 'Binding Corporate Rules (BCRs)' },
      { value: 'NONE', label: 'None — or not disclosed' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => ['YES', 'UNSURE'].includes(ans(a, 'tr_1')),
  },

  // ──────────────────────────────────────────────
  // MODULE 11 — Impact / Harm
  // ──────────────────────────────────────────────
  {
    id: 'impact_1', module: 'IMPACT', moduleIndex: 11, moduleLabel: 'Impact & Harm',
    text: 'What consequences have you experienced as a result of this situation?',
    multi: true,
    options: [
      { value: 'NONE', label: 'None so far' },
      { value: 'INCONVENIENCE', label: 'Inconvenience or nuisance' },
      { value: 'REPUTATIONAL', label: 'Reputational damage' },
      { value: 'FINANCIAL', label: 'Financial harm or loss' },
      { value: 'DISCRIMINATION', label: 'Discrimination or exclusion' },
      { value: 'DISTRESS', label: 'Psychological distress or anxiety' },
      { value: 'FUTURE_RISK', label: 'Risk of future harm' },
    ],
    shouldAsk: (a) => isAnswered(a, 'tr_1'),
  },
  {
    id: 'impact_2', module: 'IMPACT', moduleIndex: 11, moduleLabel: 'Impact & Harm',
    text: 'Is the harm or risk ongoing?',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — still ongoing' },
      { value: 'NO', label: 'No — resolved' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => isAnswered(a, 'impact_1'),
  },

  // ──────────────────────────────────────────────
  // MODULE 12 — Accountability (Art. 5(2) + Arts. 30, 35, 37)
  // ──────────────────────────────────────────────
  {
    id: 'acc_1', module: 'ACCOUNTABILITY', moduleIndex: 12, moduleLabel: 'Accountability',
    text: 'Can the organisation demonstrate GDPR compliance — documented policies, records of processing, or other evidence?',
    help: 'Art. 5(2) places the burden of proof on the controller to show that all GDPR principles are complied with.',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — evidence was provided or available' },
      { value: 'NO', label: 'No — unable or unwilling to demonstrate compliance' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => isAnswered(a, 'impact_2'),
  },
  {
    id: 'acc_2', module: 'ACCOUNTABILITY', moduleIndex: 12, moduleLabel: 'Accountability',
    text: 'Was a Data Protection Impact Assessment (DPIA) conducted where it was likely required?',
    help: 'Art. 35: a DPIA is required before high-risk processing — large-scale sensitive data, systematic monitoring, new technologies.',
    multi: false,
    options: [
      { value: 'YES', label: 'Yes — DPIA was conducted' },
      { value: 'NO', label: 'No — not conducted despite likely requirement' },
      { value: 'NOT_REQUIRED', label: 'Not applicable — no high-risk processing' },
      { value: 'UNSURE', label: 'Unsure' },
    ],
    shouldAsk: (a) => isAnswered(a, 'acc_1'),
  },
]

export const TOTAL_MODULES = 13

// ============================================================
// ENGINE — getNextQuestion
// ============================================================
export function getNextQuestion(answers: TriageAnswers): EngineQuestion | null {
  if (shouldTerminateEarly(answers)) return null
  for (const q of QUESTIONS) {
    if (!isAnswered(answers, q.id) && q.shouldAsk(answers)) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { shouldAsk: _, ...question } = q
      return question
    }
  }
  return null
}

// ============================================================
// SCENARIO INFERENCE
// ============================================================

/**
 * Keyword-based inference from a user scenario text.
 * Returns partial answers — only fields with clear evidence.
 */
export function inferAnswersFromText(scenario: string): TriageAnswers {
  const t = scenario.toLowerCase()
  const inferred: TriageAnswers = {}

  // Personal data is always YES if the user is describing a GDPR situation
  inferred.pd_1 = 'YES'
  inferred.id_1 = 'DIRECT'

  // ── Actor
  if (/\b(employer|boss|hr|human resources|workplace|my company|my employer|manager|supervisor|at work)\b/.test(t)) {
    inferred.ctx_actor = 'EMPLOYER'
  } else if (/\b(government|police|state|ministry|authority|public authority|municipality|council|court|tribunal)\b/.test(t)) {
    inferred.ctx_actor = 'STATE'
  } else if (/\b(facebook|google|twitter|instagram|tiktok|amazon|apple|meta|linkedin|youtube|platform|app|website|online service)\b/.test(t)) {
    inferred.ctx_actor = 'PLATFORM'
  } else if (/\b(doctor|hospital|clinic|gp|nurse|therapist|lawyer|solicitor|accountant|notary)\b/.test(t)) {
    inferred.ctx_actor = 'PROFESSIONAL'
  } else if (/\b(company|business|firm|shop|store|retailer|bank|insurance|supplier)\b/.test(t)) {
    inferred.ctx_actor = 'COMPANY'
  }

  // ── Format
  if (/\b(cctv|footage|video|recorded|surveillance camera)\b/.test(t)) {
    inferred.ctx_format = 'VIDEO'
  } else if (/\b(photo|image|picture|photograph|face|facial)\b/.test(t)) {
    inferred.ctx_format = 'IMAGE'
  } else if (/\b(audio|voice|recording|call|phone call|voicemail)\b/.test(t)) {
    inferred.ctx_format = 'AUDIO'
  } else if (/\b(database|spreadsheet|records|log|system|file|csv|excel)\b/.test(t)) {
    inferred.ctx_format = 'STRUCTURED'
  } else if (/\b(ip address|ip|cookie|device|tracking|location data|gps|geolocation|metadata)\b/.test(t)) {
    inferred.ctx_format = 'METADATA'
  } else {
    inferred.ctx_format = 'TEXT'
  }

  // ── Action
  if (/\b(breach|hacked|hack|leak|leaked|exposed|stolen|data breach|cyberattack|ransomware|unauthorized access)\b/.test(t)) {
    inferred.ctx_action = 'UNAUTHORIZED_ACCESS'
    inferred.breach_1 = 'YES'
  } else if (/\b(published|publicly posted|disclosed publicly|made public|posted online|shared publicly)\b/.test(t)) {
    inferred.ctx_action = 'PUBLICATION'
  } else if (/\b(sold|selling|sale|commercial transfer|transferred to third|gave to third|third.party|data broker)\b/.test(t)) {
    inferred.ctx_action = 'SALE_TRANSFER'
  } else if (/\b(refuse to delete|refused to delete|won.t delete|not deleting|won.t erase|refused.*erasure|failed to delete|delete.*refused)\b/.test(t)) {
    inferred.ctx_action = 'INCORRECT_DELETION'
    inferred.rights_1 = ['ERASURE']
  } else if (/\b(profil|profiling|scoring|credit score|automated decision|algorithm|algorithmic)\b/.test(t)) {
    inferred.ctx_action = 'PROFILING'
    inferred.prof_1 = 'YES'
  } else if (/\b(transfer|sent abroad|overseas|outside europe|outside eu|us server|american server)\b/.test(t)) {
    inferred.ctx_action = 'INTL_TRANSFER'
    inferred.tr_1 = 'YES'
  } else if (/\b(shared with|disclosed to|communicated to|passed to|sent to)\b/.test(t)) {
    inferred.ctx_action = 'COMMUNICATION'
  } else if (/\b(collect|collected|gathering|gathered|obtain)\b/.test(t)) {
    inferred.ctx_action = 'COLLECTION'
  } else if (/\b(stored|storing|keeping|kept|retaining|retained|holds my data)\b/.test(t)) {
    inferred.ctx_action = 'STORAGE'
  }

  // ── Purpose
  if (/\b(marketing|advertis|spam|newsletter|promotional|unsubscribe|direct mail|email campaign)\b/.test(t)) {
    inferred.ctx_purpose = 'MARKETING'
  } else if (/\b(health|medical|treatment|diagnosis|care|clinical|patient)\b/.test(t)) {
    inferred.ctx_purpose = 'HEALTH'
  } else if (/\b(research|study|analysis|academic|survey|statistical)\b/.test(t)) {
    inferred.ctx_purpose = 'RESEARCH'
  } else if (/\b(security|fraud prevention|anti.fraud|identity verification|kyc)\b/.test(t)) {
    inferred.ctx_purpose = 'SECURITY'
  } else if (/\b(required by law|legal obligation|compliance|regulation|statutory|legal requirement)\b/.test(t)) {
    inferred.ctx_purpose = 'LEGAL_OBLIGATION'
  }

  // ── Sensitive categories (Art. 9/10)
  const sensitive: string[] = []
  if (/\b(health|medical|diagnosis|illness|disease|patient|clinical|prescription|therapy|mental health)\b/.test(t)) sensitive.push('HEALTH')
  if (/\b(biometric|fingerprint|face recognition|facial recognition|retina|iris scan)\b/.test(t)) sensitive.push('BIOMETRIC')
  if (/\b(political|party member|political opinion|vote|voting|ideology)\b/.test(t)) sensitive.push('IDEOLOGY')
  if (/\b(religion|religious|faith|belief|church|mosque|synagogue|prayer|muslim|christian|jewish|hindu|buddhist)\b/.test(t)) sensitive.push('RELIGION')
  if (/\b(sexual|orientation|gay|lesbian|bisexual|transgender|lgbt|queer|sex life)\b/.test(t)) sensitive.push('SEXUAL_LIFE')
  if (/\b(trade union|union membership|labour union|workers union|collective)\b/.test(t)) sensitive.push('TRADE_UNION')
  if (/\b(child|children|minor|kid|teenager|under 16|under 18|student|pupil|school)\b/.test(t)) sensitive.push('CHILDREN')
  if (/\b(criminal|conviction|arrest|police record|offence|offense|crime|prosecution|guilty)\b/.test(t)) sensitive.push('CRIMINAL')
  if (sensitive.length > 0) inferred.sc_1 = sensitive

  // ── Rights exercised
  const rights: string[] = []
  if (/\b(subject access request|sar|requested.*copy|access.*data|asked.*data|right to access)\b/.test(t)) rights.push('ACCESS')
  if (/\b(delete|erasure|right to be forgotten|remove.*data|delete.*account)\b/.test(t)) rights.push('ERASURE')
  if (/\b(correct|rectif|wrong.*data|inaccurate.*data|fix.*data|update.*data)\b/.test(t)) rights.push('RECTIFICATION')
  if (/\b(objected|object to|opt.?ed out|opt.?ing out|stop.*process|opposed processing)\b/.test(t)) rights.push('OBJECTION')
  if (rights.length > 0 && !inferred.rights_1) {
    inferred.rights_1 = rights
  }

  // ── Response to rights
  if (inferred.rights_1) {
    if (/\b(no response|didn.?t respond|ignored|no reply|silence|no answer)\b/.test(t)) {
      inferred.rights_2 = 'NO_RESPONSE'
    } else if (/\b(refused|rejection|rejected|denied|said no|refused to comply)\b/.test(t)) {
      inferred.rights_2 = 'UNJUSTIFIED_REFUSAL'
    } else if (/\b(late|overdue|took too long|past.*deadline|after.*month)\b/.test(t)) {
      inferred.rights_2 = 'LATE'
    }
  }

  // ── Breach notification
  if (inferred.breach_1 === 'YES') {
    if (/\b(notified me|told me|informed me|sent.*notice|received.*notification|they let me know)\b/.test(t)) {
      inferred.breach_3 = 'YES'
    } else if (/\b(never told|not informed|wasn.?t notified|no notification|didn.?t tell me|found out.*myself|found out.*other)\b/.test(t)) {
      inferred.breach_3 = 'NO'
    }
  }

  // ── Impact / harm
  const impacts: string[] = []
  if (/\b(financial loss|money|cost|expense|fraud|stolen.*money|economic damage|charged)\b/.test(t)) impacts.push('FINANCIAL')
  if (/\b(reputation|reputational|embarrass|shame|humiliat|publicly exposed|image damage)\b/.test(t)) impacts.push('REPUTATIONAL')
  if (/\b(discriminat|fired|termination|denied job|job loss|refused service|excluded)\b/.test(t)) impacts.push('DISCRIMINATION')
  if (/\b(stress|anxiety|distress|upset|worried|fear|scared|psychological|mental health impact)\b/.test(t)) impacts.push('DISTRESS')
  if (/\b(risk|future|potential|could be used|worried about)\b/.test(t)) impacts.push('FUTURE_RISK')
  if (impacts.length > 0) inferred.impact_1 = impacts

  // ── Lawful basis clues
  if (/\b(gave.*consent|consent.*gave|agreed|gave permission|opted in|signed up|subscribed|ticked)\b/.test(t)) {
    inferred.lb_main = 'CONSENT'
  } else if (/\b(contract|terms of service|terms and conditions|service agreement|agreement)\b/.test(t)) {
    inferred.lb_main = 'CONTRACT'
  } else if (/\b(legal obligation|required by law|statutory|law.*requires|regulation.*requires)\b/.test(t)) {
    inferred.lb_main = 'LEGAL_OBLIGATION'
  }

  return inferred
}

/**
 * Claude-based extraction — returns improved inferred answers.
 * Falls back gracefully on error.
 */
export async function extractAnswersWithClaude(
  scenario: string,
  apiKey: string,
): Promise<TriageAnswers> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Analyse this GDPR scenario and extract structured information to pre-fill an assessment form.
Return a JSON object where keys are question IDs and values are answers. ONLY include fields where the scenario provides CLEAR evidence. Omit uncertain fields.

Valid question IDs and values:
- pd_1: "YES"|"NO"|"UNSURE"
- id_1: "DIRECT"|"INDIRECT"|"NO"|"UNSURE"
- ctx_format: "TEXT"|"IMAGE"|"VIDEO"|"AUDIO"|"STRUCTURED"|"METADATA"|"MIXED"
- ctx_actor: "STATE"|"COMPANY"|"PLATFORM"|"EMPLOYER"|"PROFESSIONAL"|"PERSON"|"UNSURE"
- ctx_location: "EU"|"OUTSIDE_EU_EU_EFFECTS"|"OUTSIDE_EU"|"UNSURE"
- ctx_action: "COLLECTION"|"STORAGE"|"INTERNAL_USE"|"COMMUNICATION"|"PUBLICATION"|"SALE_TRANSFER"|"INTL_TRANSFER"|"INCORRECT_DELETION"|"UNAUTHORIZED_ACCESS"|"PROFILING"
- ctx_purpose: "SERVICE"|"LEGAL_OBLIGATION"|"MARKETING"|"SECURITY"|"RESEARCH"|"STATISTICS"|"HEALTH"|"JUSTICE"|"OTHER"|"UNSURE"
- lb_main: "CONSENT"|"CONTRACT"|"LEGAL_OBLIGATION"|"VITAL_INTERESTS"|"PUBLIC_TASK"|"LEGITIMATE_INTERESTS"|"UNSURE"
- sc_1: array from ["HEALTH","BIOMETRIC","IDEOLOGY","RELIGION","SEXUAL_LIFE","TRADE_UNION","CHILDREN","CRIMINAL","NONE"]
- breach_1: "YES"|"NO"|"UNSURE"
- breach_3: "YES"|"PARTIAL"|"NO"|"UNSURE"
- prof_1: "YES"|"NO"|"UNSURE"
- prof_2: "YES"|"NO"|"UNSURE"
- tr_1: "YES"|"NO"|"UNSURE"
- rights_1: array from ["ACCESS","RECTIFICATION","ERASURE","OBJECTION","RESTRICTION","PORTABILITY","NONE"]
- rights_2: "ON_TIME"|"LATE"|"PARTIAL"|"NO_RESPONSE"|"UNJUSTIFIED_REFUSAL"|"UNSURE"
- impact_1: array from ["NONE","INCONVENIENCE","REPUTATIONAL","FINANCIAL","DISCRIMINATION","DISTRESS","FUTURE_RISK"]
- p_transparency: "YES"|"PARTIAL"|"NO"|"UNSURE"
- p_purpose_change: "YES"|"NO"|"UNSURE"

Be conservative. Only include what is clearly stated. Return only raw JSON, no markdown.

Scenario: ${scenario}`,
        },
      ],
    }),
  })

  if (!res.ok) throw new Error(`API ${res.status}`)
  const data = await res.json() as { content: { type: string; text: string }[] }
  const text = data.content.find((c) => c.type === 'text')?.text ?? '{}'
  return JSON.parse(text) as TriageAnswers
}

export function getProgress(answers: TriageAnswers): { current: number; total: number } {
  const answered = QUESTIONS.filter((q) => isAnswered(answers, q.id)).length
  const relevant = QUESTIONS.filter((q) => q.shouldAsk(answers) || isAnswered(answers, q.id)).length
  return { current: answered, total: Math.max(relevant, answered) }
}

// ============================================================
// ENGINE — computeResult
// ============================================================
export function computeResult(answers: TriageAnswers): TriageResult {
  let risk: RiskLevel = 'LOW'
  const tags = new Set<string>()
  const articles = new Set<string>()
  const actions: string[] = []
  const principles: Record<string, PrincipleStatus> = {
    'Art. 5(1)(a) — Lawfulness, Fairness & Transparency': 'UNKNOWN',
    'Art. 5(1)(b) — Purpose Limitation': 'UNKNOWN',
    'Art. 5(1)(c) — Data Minimisation': 'UNKNOWN',
    'Art. 5(1)(d) — Accuracy': 'UNKNOWN',
    'Art. 5(1)(e) — Storage Limitation': 'UNKNOWN',
    'Art. 5(1)(f) — Integrity & Confidentiality': 'UNKNOWN',
    'Art. 5(2) — Accountability': 'UNKNOWN',
  }

  function bump(level: RiskLevel) {
    const order: RiskLevel[] = ['LOW', 'MED', 'HIGH', 'CRITICAL']
    if (order.indexOf(level) > order.indexOf(risk)) risk = level
  }

  // Early termination
  if (shouldTerminateEarly(answers)) {
    return {
      gdpr_applicable: false,
      risk_level: 'LOW',
      principle_flags: principles,
      likely_articles: [],
      case_tags: ['NO_GDPR_SCOPE'],
      next_actions: ['GDPR likely does not apply. Consider other applicable national data protection laws.'],
      verdict_title: 'GDPR likely does not apply',
      verdict_summary:
        'Based on your answers, this situation may fall outside the scope of GDPR — either because it does not involve personal data, the data is not sufficiently identifying, or the processing has no EU connection.',
    }
  }

  articles.add('ART_5_PRINCIPLES_BASELINE')

  // ── Personal Data
  const pd1 = ans(answers, 'pd_1')
  if (pd1 === 'UNSURE' && ans(answers, 'pd_3') === 'YES') tags.add('REIDENTIFICATION_RISK')

  // ── Context
  const actor = ans(answers, 'ctx_actor')
  const action = ans(answers, 'ctx_action')
  tags.add('ACTOR_' + actor)
  tags.add('ACTION_' + action)

  if (action === 'PUBLICATION') { articles.add('ART_5_PUBLIC_DISCLOSURE_RISK'); bump('HIGH') }
  if (action === 'UNAUTHORIZED_ACCESS') { articles.add('ART_32_SECURITY_RISK'); bump('HIGH') }
  if (action === 'INTL_TRANSFER') { articles.add('CHAPTER_V_TRANSFER_RISK'); bump('HIGH') }
  if (action === 'PROFILING') { articles.add('ART_22_PROFILING_RISK'); bump('MED') }
  if (action === 'SALE_TRANSFER') bump('HIGH')

  // ── Lawful Basis
  const lb = ans(answers, 'lb_main')
  if (lb === 'UNSURE') {
    articles.add('ART_6_LAWFULNESS_UNCERTAIN')
    bump('HIGH')
  }
  if (lb === 'CONSENT') {
    const consentChecks = ['lb_a_1', 'lb_a_2', 'lb_a_3', 'lb_a_4', 'lb_a_5']
    if (consentChecks.some((q) => ans(answers, q) === 'NO')) {
      tags.add('CONSENT_DEFECTIVE')
      articles.add('ART_6_1_A_CONSENT_RISK')
      articles.add('ART_7_CONDITIONS_RISK')
      bump('HIGH')
    }
  }
  if (lb === 'CONTRACT') {
    if (ans(answers, 'lb_b_1') === 'NO') {
      tags.add('CONTRACT_NECESSITY_FAIL')
      articles.add('ART_6_1_B_NECESSITY_RISK')
      bump('HIGH')
    }
    if (ans(answers, 'lb_b_2') === 'YES') {
      articles.add('ART_5_1_C_DATA_MINIMISATION_RISK')
      bump('MED')
    }
  }
  if (lb === 'LEGAL_OBLIGATION' && ans(answers, 'lb_c_2') === 'NO') {
    articles.add('ART_5_1_C_DATA_MINIMISATION_RISK')
    bump('MED')
  }
  if (lb === 'VITAL_INTERESTS' && ans(answers, 'lb_d_1') !== 'YES') {
    articles.add('ART_6_1_D_VITAL_INTERESTS_RISK')
    bump('HIGH')
  }
  if (lb === 'PUBLIC_TASK' && ans(answers, 'lb_e_1') === 'NO') {
    articles.add('ART_6_1_E_PUBLIC_TASK_DISPROPORTIONATE')
    bump('HIGH')
  }
  if (lb === 'LEGITIMATE_INTERESTS') {
    if (actor === 'STATE') {
      tags.add('LI_NOT_AVAILABLE_PUBLIC_AUTHORITY')
      articles.add('ART_6_1_F_NOT_APPLICABLE_TO_PUBLIC_AUTHORITIES')
      bump('HIGH')
    }
    if (ans(answers, 'lb_f_1') === 'NO') {
      articles.add('ART_13_14_INFO_DEFICIT')
      bump('MED')
    }
    if (ans(answers, 'lb_f_2') === 'YES') { tags.add('LI_CHILD_HEIGHTENED_SCRUTINY'); bump('HIGH') }
    if (ans(answers, 'lb_f_3') === 'YES') {
      tags.add('LI_BALANCING_FAIL')
      articles.add('ART_6_1_F_BALANCING_RISK')
      bump('HIGH')
    }
  }

  // ── Art. 5 Principles
  const transp = ans(answers, 'p_transparency')
  const fairness = ans(answers, 'p_fairness')
  if (transp === 'NO' || fairness === 'NO' || transp === 'PARTIAL') {
    principles['Art. 5(1)(a) — Lawfulness, Fairness & Transparency'] = 'FAIL'
    articles.add('ART_5_1_A_RISK')
    bump(transp === 'NO' || fairness === 'NO' ? 'HIGH' : 'MED')
  } else if (transp === 'YES' && fairness === 'YES') {
    principles['Art. 5(1)(a) — Lawfulness, Fairness & Transparency'] = 'PASS'
  }
  if (transp === 'NO') articles.add('ART_12_14_INFO_DEFICIT')

  const purposeChange = ans(answers, 'p_purpose_change')
  if (purposeChange === 'YES') {
    tags.add('PURPOSE_CHANGE')
    articles.add('ART_5_1_B_PURPOSE_LIMITATION_RISK')
    principles['Art. 5(1)(b) — Purpose Limitation'] = 'FAIL'
    bump('MED')
  } else if (purposeChange === 'NO') {
    principles['Art. 5(1)(b) — Purpose Limitation'] = 'PASS'
  }

  const minim = ans(answers, 'p_minimisation')
  if (minim === 'NO') {
    principles['Art. 5(1)(c) — Data Minimisation'] = 'FAIL'
    articles.add('ART_5_1_C_DATA_MINIMISATION_RISK')
    bump('MED')
  } else if (minim === 'YES') {
    principles['Art. 5(1)(c) — Data Minimisation'] = 'PASS'
  }

  const accuracy = ans(answers, 'p_accuracy')
  if (accuracy === 'NO') {
    principles['Art. 5(1)(d) — Accuracy'] = 'FAIL'
    articles.add('ART_5_1_D_ACCURACY_RISK')
    bump('MED')
  } else if (accuracy === 'YES') {
    principles['Art. 5(1)(d) — Accuracy'] = 'PASS'
  }

  const storage = ans(answers, 'p_storage')
  if (storage === 'YES') {
    principles['Art. 5(1)(e) — Storage Limitation'] = 'FAIL'
    articles.add('ART_5_1_E_STORAGE_LIMITATION_RISK')
    bump('HIGH')
  } else if (storage === 'NO') {
    principles['Art. 5(1)(e) — Storage Limitation'] = 'PASS'
  }

  // ── Special Categories
  const scArr = ansArr(answers, 'sc_1')
  const hasSensitive = scArr.some((v) => !['NONE', 'CRIMINAL', 'CHILDREN'].includes(v))
  const hasCriminal = scArr.includes('CRIMINAL')
  const hasChildren = scArr.includes('CHILDREN')
  if (hasSensitive) { tags.add('SPECIAL_CATEGORY_PRESENT'); articles.add('ART_9_SPECIAL_CATEGORY_RISK'); bump('HIGH') }
  if (hasCriminal) { tags.add('ART10_CRIMINAL_DATA'); articles.add('ART_10_CRIMINAL_DATA_RISK'); bump('HIGH') }
  if (hasChildren) { tags.add('CHILDREN_DATA'); bump('HIGH') }
  if ((hasSensitive || hasCriminal) && ['PUBLICATION', 'UNAUTHORIZED_ACCESS', 'SALE_TRANSFER'].includes(action)) {
    bump('CRITICAL')
  }

  // ── Rights
  const rightsArr = ansArr(answers, 'rights_1')
  if (!rightsArr.includes('NONE') && rightsArr.length > 0) {
    const resp = ans(answers, 'rights_2')
    if (['NO_RESPONSE', 'UNJUSTIFIED_REFUSAL'].includes(resp)) {
      articles.add('ART_12_22_RIGHTS_HANDLING_RISK')
      bump('HIGH')
    } else if (['LATE', 'PARTIAL'].includes(resp)) {
      articles.add('ART_12_22_RIGHTS_HANDLING_RISK')
      bump('MED')
    }
  }

  // ── Breach
  const breach1 = ans(answers, 'breach_1')
  if (breach1 === 'YES') {
    articles.add('ART_32_SECURITY_RISK')
    principles['Art. 5(1)(f) — Integrity & Confidentiality'] = 'FAIL'
    bump('HIGH')
    if (ans(answers, 'breach_3') === 'NO') { articles.add('ART_34_BREACH_NOTIFICATION_RISK'); bump('HIGH') }
    if (hasSensitive || hasCriminal) bump('CRITICAL')
  }

  // ── Profiling
  if (ans(answers, 'prof_2') === 'YES') {
    articles.add('ART_22_AUTOMATED_DECISION_RISK')
    bump('HIGH')
    if (ans(answers, 'prof_3') === 'NO') bump('HIGH')
  }

  // ── Transfers
  if (ans(answers, 'tr_1') === 'YES') {
    articles.add('CHAPTER_V_TRANSFER_RISK')
    if (['NONE', 'UNSURE'].includes(ans(answers, 'tr_2'))) bump('HIGH')
  }

  // ── Impact
  const impactArr = ansArr(answers, 'impact_1')
  if (impactArr.includes('DISCRIMINATION')) bump('CRITICAL')
  else if (impactArr.includes('FINANCIAL') || impactArr.includes('REPUTATIONAL')) bump('HIGH')
  else if (impactArr.includes('DISTRESS') || impactArr.includes('INCONVENIENCE')) bump('MED')

  // ── Accountability
  const acc1 = ans(answers, 'acc_1')
  if (acc1 === 'NO') {
    principles['Art. 5(2) — Accountability'] = 'FAIL'
    articles.add('ART_5_2_ACCOUNTABILITY_RISK')
    bump('HIGH')
  } else if (acc1 === 'YES') {
    principles['Art. 5(2) — Accountability'] = 'PASS'
  }
  if (ans(answers, 'acc_2') === 'NO') { articles.add('ART_35_DPIA_RISK'); bump('MED') }

  // ── Next Actions
  if (articles.has('ART_12_14_INFO_DEFICIT') || articles.has('ART_5_1_A_RISK')) {
    actions.push('Request full information in writing: processing purposes, legal basis, recipients, retention period, your rights, and DPO contact.')
  }
  if (articles.has('ART_12_22_RIGHTS_HANDLING_RISK')) {
    actions.push('Formally exercise your rights in writing and retain all correspondence as evidence. Cite the relevant GDPR articles in your request.')
  }
  if (breach1 === 'YES') {
    actions.push('Request a written incident report: date of breach, scope, categories of data affected, and remedial measures taken. Consider filing with your national DPA.')
  }
  if (articles.has('CHAPTER_V_TRANSFER_RISK')) {
    actions.push('Demand evidence of transfer safeguards (adequacy decision or Standard Contractual Clauses). If none exist, request cessation of the transfers.')
  }
  if (articles.has('ART_22_AUTOMATED_DECISION_RISK')) {
    actions.push('Invoke your Art. 22 rights: request human intervention, obtain an explanation of the decision logic, and formally contest the outcome.')
  }
  if (hasSensitive) {
    actions.push('For Art. 9 sensitive data, demand the specific exception being relied on. General consent or legitimate interest is not sufficient — explicit consent or a specific legal basis is required.')
  }
  if (articles.has('ART_5_2_ACCOUNTABILITY_RISK')) {
    actions.push('Request evidence of compliance: data protection policies, Records of Processing Activities (RoPA), DPIAs, and DPO contact details.')
  }
  if (purposeChange === 'YES') {
    actions.push('Challenge the compatibility of the secondary purpose. Request the legal basis for the new use of your data under Art. 6(4).')
  }
  if (risk === 'CRITICAL') {
    actions.push('CRITICAL PRIORITY: Document all evidence immediately, take steps to stop ongoing exposure, and file an urgent complaint with your national DPA or seek legal counsel.')
  } else if (risk === 'HIGH') {
    actions.push('HIGH PRIORITY: Collect evidence, assert your rights formally in writing, and escalate to the DPA if the organisation does not respond within 30 days.')
  } else if (risk === 'MED') {
    actions.push('Contact the organisation in writing, citing the relevant GDPR provisions. Allow 30 days for a response before escalating to the DPA.')
  } else {
    actions.push("Start with a written information request. Review the organisation's privacy policy and consider contacting their Data Protection Officer (DPO).")
  }

  // ── Verdict text
  const issueCount = articles.size - 1
  const verdictTitle =
    risk === 'CRITICAL' ? 'Critical GDPR violation identified'
    : risk === 'HIGH'   ? 'Significant GDPR breach found'
    : risk === 'MED'    ? 'Potential GDPR concerns identified'
    :                     'Limited GDPR issues detected'

  const verdictSummary =
    risk === 'CRITICAL'
      ? `Your assessment reveals a critical risk situation with ${issueCount} GDPR concern${issueCount !== 1 ? 's' : ''}. Immediate action is strongly recommended to protect your rights and stop further harm.`
    : risk === 'HIGH'
      ? `Your assessment has identified significant GDPR concerns across ${issueCount} area${issueCount !== 1 ? 's' : ''}. You have strong grounds to assert your data rights formally.`
    : risk === 'MED'
      ? `Your assessment has found possible GDPR issues. The strength of a formal complaint depends on additional details, but you have grounds to contact the organisation and exercise your rights.`
      : `Your assessment suggests limited GDPR issues in your situation. You still have rights worth exercising to understand how your data is being handled.`

  return {
    gdpr_applicable: true,
    risk_level: risk,
    principle_flags: principles,
    likely_articles: [...articles].filter((a) => a !== 'ART_5_PRINCIPLES_BASELINE'),
    case_tags: [...tags],
    next_actions: [...new Set(actions)],
    verdict_title: verdictTitle,
    verdict_summary: verdictSummary,
  }
}
