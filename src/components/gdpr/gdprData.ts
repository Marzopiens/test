export type VerdictKey = 'strong' | 'possible' | 'limited' | 'none'

export interface Verdict {
  key: VerdictKey
  label: string
  title: string
  summary: string
  rights: string[]
  actions: string[]
  legalRef: string
}

export interface TreeQuestion {
  id: string
  question: string
  help?: string
  options: { label: string; next: string }[]
}

export type TreeNode = TreeQuestion | Verdict

export function isVerdict(node: TreeNode): node is Verdict {
  return 'key' in node
}

export const TREE: Record<string, TreeNode> = {
  start: {
    id: 'start',
    question: 'What is your main concern about how your personal data is being handled?',
    help: 'Under GDPR, personal data includes any information that can identify you directly or indirectly — name, email, location, IP address, etc.',
    options: [
      { label: 'An organisation refused my data access or erasure request', next: 'q_refusal' },
      { label: 'My personal data was shared without my consent', next: 'q_shared' },
      { label: 'I received unwanted direct marketing or profiling', next: 'q_marketing' },
      { label: 'There was a data breach affecting my data', next: 'q_breach' },
    ],
  },
  q_refusal: {
    id: 'q_refusal',
    question: 'Did the organisation provide any reason for refusing your request?',
    help: 'Under GDPR Art. 12, organisations must respond within one month and provide reasons if they refuse a data subject request.',
    options: [
      { label: 'No response at all within 30 days', next: 'result_strong' },
      { label: 'They claimed an exemption applies', next: 'q_exemption' },
      { label: 'They said they do not hold my data', next: 'result_limited' },
      { label: 'They partially fulfilled my request', next: 'result_possible' },
    ],
  },
  q_exemption: {
    id: 'q_exemption',
    question: 'Did they explain which GDPR exemption they are relying on?',
    help: 'Controllers may refuse requests under limited exemptions (Art. 17(3)) but must clearly communicate which one applies.',
    options: [
      { label: 'No, they gave a vague or no explanation', next: 'result_strong' },
      { label: 'Yes, they cited legal obligation or public interest', next: 'result_limited' },
      { label: 'Yes, but it seemed unreasonable for my case', next: 'result_possible' },
    ],
  },
  q_shared: {
    id: 'q_shared',
    question: 'Did you consent to your data being shared with third parties?',
    help: 'Organisations need a lawful basis (Art. 6) to share your data. Consent must be freely given, specific, and unambiguous.',
    options: [
      { label: 'No, I never consented to this sharing', next: 'result_strong' },
      { label: 'I may have agreed via lengthy terms of service', next: 'result_possible' },
      { label: 'I consented but now want to withdraw it', next: 'q_withdraw' },
    ],
  },
  q_withdraw: {
    id: 'q_withdraw',
    question: 'Have you formally contacted the organisation to withdraw consent?',
    help: 'Under Art. 7(3), withdrawal of consent must be as easy as giving it. The controller must stop processing upon withdrawal.',
    options: [
      { label: 'Yes, but they continued processing my data', next: 'result_strong' },
      { label: "No, I haven't contacted them yet", next: 'result_possible' },
    ],
  },
  q_marketing: {
    id: 'q_marketing',
    question: 'Did you explicitly opt in to receive this marketing?',
    help: 'Direct marketing under GDPR requires specific, informed consent. Pre-ticked boxes or bundled consent are not valid.',
    options: [
      { label: 'No, I never signed up for marketing', next: 'result_strong' },
      { label: 'I may have, via a pre-ticked box or buried clause', next: 'result_possible' },
      { label: 'I opted out but still receive communications', next: 'result_strong' },
    ],
  },
  q_breach: {
    id: 'q_breach',
    question: 'Were you notified about the data breach by the organisation?',
    help: 'Under Art. 34, organisations must notify individuals without undue delay when a breach is likely to result in high risk to their rights.',
    options: [
      { label: 'No, I found out through other means', next: 'result_strong' },
      { label: 'Yes, and they explained the risk and remediation', next: 'result_possible' },
      { label: 'Yes, but the notification was vague or unhelpful', next: 'result_possible' },
      { label: 'The breach appeared minor and low-risk', next: 'result_none' },
    ],
  },
  result_strong: {
    key: 'strong',
    label: 'Strong Case',
    title: 'You likely have a strong GDPR claim',
    summary:
      'Based on your answers, it appears the organisation has breached GDPR requirements in a way that directly affects your rights. You have strong grounds to pursue a formal complaint with your national Data Protection Authority.',
    rights: [
      'Right to erasure — Art. 17',
      'Right to rectification — Art. 16',
      'Right to access your data — Art. 15',
      'Right to data portability — Art. 20',
    ],
    actions: [
      'Send a formal Subject Access Request (SAR) in writing',
      'File a complaint with your national DPA (see below)',
      'Document all communications with the organisation',
      'Consider seeking independent legal advice',
    ],
    legalRef: 'GDPR Arts. 15–22 (Data Subject Rights) · Art. 77 (Right to lodge complaint) · Art. 82 (Right to compensation)',
  } as Verdict,
  result_possible: {
    key: 'possible',
    label: 'Possible Claim',
    title: 'You may have a valid GDPR claim',
    summary:
      'Your situation suggests a possible GDPR violation. The strength of your claim depends on additional details. We recommend contacting the organisation directly first, then escalating to the DPA if the issue is unresolved.',
    rights: [
      'Right to information — Arts. 13–14',
      'Right to restriction of processing — Art. 18',
      'Right to object to processing — Art. 21',
    ],
    actions: [
      "Contact the organisation's Data Protection Officer (DPO)",
      'Submit a written request citing the relevant GDPR articles',
      'Allow 30 days for a response before escalating',
      'File with your DPA if no satisfactory resolution',
    ],
    legalRef: 'GDPR Arts. 13–14 (Transparency) · Art. 21 (Right to object) · Art. 77 (Right to complain)',
  } as Verdict,
  result_limited: {
    key: 'limited',
    label: 'Limited Basis',
    title: 'Limited GDPR basis in your situation',
    summary:
      'Based on your answers, the organisation may have a lawful basis for processing your data. Your claim may be limited, but you still have important rights worth exercising to understand what data is held about you.',
    rights: [
      'Right to access your data — Art. 15',
      'Right to know the processing purposes — Art. 13',
    ],
    actions: [
      'Submit a Subject Access Request to see what data they hold',
      'Ask for clarification on their legal basis for processing',
      'Review the Privacy Policy of the organisation',
    ],
    legalRef: 'GDPR Art. 6 (Lawful basis) · Art. 15 (Right of access) · Art. 13 (Information to be provided)',
  } as Verdict,
  result_none: {
    key: 'none',
    label: 'No Clear Claim',
    title: 'GDPR may not apply in your case',
    summary:
      'Based on your answers, this situation may not constitute a GDPR violation. The data processing might be lawful, or the breach may not have created significant risk. You may still wish to contact the organisation for peace of mind.',
    rights: ['Right to be informed about processing — Art. 13'],
    actions: [
      'Review the Privacy Policy of the relevant service',
      'Contact the organisation if you have unanswered questions',
      'Consult a legal professional for personalised advice',
    ],
    legalRef: 'GDPR Art. 2 (Material scope) · Art. 3 (Territorial scope) · Art. 34 (Communication of breach)',
  } as Verdict,
}

export const DPA_LIST = [
  { country: 'Austria', name: 'Datenschutzbehörde', url: 'https://www.dsb.gv.at/' },
  { country: 'Belgium', name: 'Autorité de protection des données', url: 'https://www.autoriteprotectiondonnees.be/' },
  { country: 'Bulgaria', name: 'Commission for Personal Data Protection', url: 'https://www.cpdp.bg/' },
  { country: 'Croatia', name: 'AZOP', url: 'https://azop.hr/' },
  { country: 'Cyprus', name: 'Commissioner for Personal Data Protection', url: 'http://www.dataprotection.gov.cy/' },
  { country: 'Czech Republic', name: 'ÚOOÚ', url: 'https://www.uoou.cz/' },
  { country: 'Denmark', name: 'Datatilsynet', url: 'https://www.datatilsynet.dk/' },
  { country: 'Estonia', name: 'Andmekaitse Inspektsioon', url: 'https://www.aki.ee/' },
  { country: 'Finland', name: 'Tietosuojavaltuutettu', url: 'https://tietosuoja.fi/' },
  { country: 'France', name: 'CNIL', url: 'https://www.cnil.fr/' },
  { country: 'Germany', name: 'BfDI', url: 'https://www.bfdi.bund.de/' },
  { country: 'Greece', name: 'Hellenic DPA', url: 'https://www.dpa.gr/' },
  { country: 'Hungary', name: 'NAIH', url: 'https://naih.hu/' },
  { country: 'Ireland', name: 'Data Protection Commission', url: 'https://www.dataprotection.ie/' },
  { country: 'Italy', name: 'Garante Privacy', url: 'https://www.garanteprivacy.it/' },
  { country: 'Latvia', name: 'Datu valsts inspekcija', url: 'https://www.dvi.gov.lv/' },
  { country: 'Lithuania', name: 'VDAI', url: 'https://vdai.lrv.lt/' },
  { country: 'Luxembourg', name: 'CNPD', url: 'https://cnpd.public.lu/' },
  { country: 'Malta', name: 'IDPC', url: 'https://idpc.org.mt/' },
  { country: 'Netherlands', name: 'Autoriteit Persoonsgegevens', url: 'https://www.autoriteitpersoonsgegevens.nl/' },
  { country: 'Poland', name: 'UODO', url: 'https://uodo.gov.pl/' },
  { country: 'Portugal', name: 'CNPD', url: 'https://www.cnpd.pt/' },
  { country: 'Romania', name: 'ANSPDCP', url: 'https://www.dataprotection.ro/' },
  { country: 'Slovakia', name: 'ÚOOÚ SR', url: 'https://dataprotection.gov.sk/' },
  { country: 'Slovenia', name: 'Informacijski pooblaščenec', url: 'https://www.ip-rs.si/' },
  { country: 'Spain', name: 'AEPD', url: 'https://www.aepd.es/' },
  { country: 'Sweden', name: 'IMY', url: 'https://www.imy.se/' },
]
