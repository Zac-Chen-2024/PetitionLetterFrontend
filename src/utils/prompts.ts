// Section types for paragraph generation
export const SECTION_TYPES = [
  { key: 'qualifying_relationship', label: 'Qualifying Corporate Relationship & Physical Premises' },
  { key: 'qualifying_employment', label: 'Qualifying Employment Abroad' },
  { key: 'qualifying_capacity', label: 'Qualifying Capacity (L-1A/L-1B)' },
  { key: 'doing_business', label: 'Doing Business / Active Operations' },
];

// Standard display names
export const STANDARD_DISPLAY_NAMES: Record<string, { chinese: string; english: string }> = {
  qualifying_relationship: {
    chinese: '合格的公司关系',
    english: 'Qualifying Corporate Relationship'
  },
  qualifying_employment: {
    chinese: '海外合格任职',
    english: 'Qualifying Employment Abroad'
  },
  qualifying_capacity: {
    chinese: '合格的职位性质',
    english: 'Qualifying Capacity'
  },
  doing_business: {
    chinese: '持续运营',
    english: 'Doing Business'
  }
};

export interface WritingPromptParams {
  petitionerName: string;
  foreignEntityName: string;
  beneficiaryName: string;
}

// Writing prompts for each section
const WRITING_PROMPT_QUALIFYING_RELATIONSHIP = `You are a Senior Immigration Attorney. Write a persuasive two-paragraph legal argument for "QUALIFYING RELATIONSHIP BETWEEN FOREIGN PARENT COMPANY AND THE U.S. PETITIONER AND SUFFICIENT PHYSICAL PREMISES".

**Evidence:**
[EVIDENCE_PLACEHOLDER]

**Key Entities:**
Petitioner: [PETITIONER_NAME] | Foreign Entity: [FOREIGN_ENTITY_NAME] | Beneficiary: [BENEFICIARY_NAME]

**Instructions:**
- Paragraph 1: Prove the parent-subsidiary link (stock ownership, formation date, shareholder names)
- Paragraph 2: Prove sufficient physical premises (lease, address, rent payments)
- Citation Format: [Exhibit {exhibit_id}: {file_name}]
- Output: JSON with paragraph_text and citations_used array`;

const WRITING_PROMPT_QUALIFYING_EMPLOYMENT = `You are a Senior Immigration Attorney. Write a comprehensive narrative for "BENEFICIARY'S QUALIFYING EMPLOYMENT ABROAD".

**Evidence:**
[EVIDENCE_PLACEHOLDER]

**Key Entities:**
Petitioner: [PETITIONER_NAME] | Foreign Entity: [FOREIGN_ENTITY_NAME] | Beneficiary: [BENEFICIARY_NAME]

**Instructions:**
- Section 1: Continuous employment (1+ year in past 3 years)
- Section 2: Executive duties in a, b, c, d format (Strategic, Operational, Financial, Representation)
- Section 3: Oversight of professional staff
- Citation Format: [Exhibit {exhibit_id}: {file_name}]
- Output: JSON with paragraph_text and citations_used array`;

const WRITING_PROMPT_QUALIFYING_CAPACITY = `You are a Senior Immigration Attorney. Write a two-paragraph legal argument for "BENEFICIARY'S QUALIFYING CAPACITY - EXECUTIVE/MANAGERIAL ROLE".

**Evidence:**
[EVIDENCE_PLACEHOLDER]

**Key Entities:**
Petitioner: [PETITIONER_NAME] | Foreign Entity: [FOREIGN_ENTITY_NAME] | Beneficiary: [BENEFICIARY_NAME]

**Instructions:**
- Paragraph 1: Foreign position (title, subordinates, decision-making authority)
- Paragraph 2: Proposed U.S. position (duties, reporting structure)
- Citation Format: [Exhibit {exhibit_id}: {file_name}]
- Output: JSON with paragraph_text and citations_used array`;

const WRITING_PROMPT_DOING_BUSINESS = `You are a Senior Immigration Attorney. Write a two-paragraph legal argument for "BOTH ENTITIES ARE ACTIVELY DOING BUSINESS".

**Evidence:**
[EVIDENCE_PLACEHOLDER]

**Key Entities:**
Petitioner: [PETITIONER_NAME] | Foreign Entity: [FOREIGN_ENTITY_NAME] | Beneficiary: [BENEFICIARY_NAME]

**Instructions:**
- Paragraph 1: U.S. Petitioner's active operations (bank statements, revenue, employees)
- Paragraph 2: Foreign Entity's active operations (registration, financials, employees)
- Citation Format: [Exhibit {exhibit_id}: {file_name}]
- Output: JSON with paragraph_text and citations_used array`;

// Map section key to its specific prompt
export const SECTION_WRITING_PROMPTS: Record<string, string> = {
  qualifying_relationship: WRITING_PROMPT_QUALIFYING_RELATIONSHIP,
  qualifying_employment: WRITING_PROMPT_QUALIFYING_EMPLOYMENT,
  qualifying_capacity: WRITING_PROMPT_QUALIFYING_CAPACITY,
  doing_business: WRITING_PROMPT_DOING_BUSINESS,
};

// Generate the complete writing prompt with evidence and entity names
export function generateSectionWritingPrompt(
  sectionKey: string,
  evidence: string,
  params: WritingPromptParams
): string {
  const basePrompt = SECTION_WRITING_PROMPTS[sectionKey] || SECTION_WRITING_PROMPTS.qualifying_relationship;

  return basePrompt
    .replace('[EVIDENCE_PLACEHOLDER]', evidence)
    .replace('[PETITIONER_NAME]', params.petitionerName || '[Petitioner]')
    .replace('[FOREIGN_ENTITY_NAME]', params.foreignEntityName || '[Foreign Entity]')
    .replace('[BENEFICIARY_NAME]', params.beneficiaryName || '[Beneficiary]');
}
