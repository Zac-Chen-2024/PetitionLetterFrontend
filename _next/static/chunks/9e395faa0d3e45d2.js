(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,18566,(e,t,i)=>{t.exports=e.r(76562)},18279,e=>{"use strict";let t=e.i(47167).default.env.NEXT_PUBLIC_API_BASE_URL||"http://localhost:8000";async function i(e,i){let a=`${t}${e}`,o=await fetch(a,{...i,headers:{"Content-Type":"application/json",...i?.headers}});if(!o.ok)throw Error(await o.text()||`API error: ${o.status}`);return o.json()}e.s(["analysisApi",0,{getStandards:()=>i("/api/l1-standards"),analyzeDocuments:(e,t)=>{let a=t&&t.length>0?`?doc_ids=${t.join(",")}`:"";return i(`/api/l1-analyze/${e}${a}`,{method:"POST"})},saveManualAnalysis:(e,t)=>i(`/api/l1-manual-analysis/${e}`,{method:"POST",body:JSON.stringify(t)}),getSummary:e=>i(`/api/l1-summary/${e}`),generateSummary:e=>i(`/api/l1-summary/${e}`,{method:"POST"}),getStatus:e=>i(`/api/l1-status/${e}`)},"documentApi",0,{getDocuments:e=>i(`/api/documents/${e}`),upload:async(e,i,a,o)=>{let r=new FormData;r.append("file",i),r.append("project_id",e),a&&r.append("exhibit_number",a),o&&r.append("exhibit_title",o);let n=await fetch(`${t}/api/upload`,{method:"POST",body:r});if(!n.ok)throw Error(`Upload failed: ${n.status}`);return n.json()},deleteDocument:e=>i(`/api/document/${e}`,{method:"DELETE"}),deleteDocumentsBatch:(e,t)=>i(`/api/document/batch/${e}`,{method:"DELETE",body:JSON.stringify(t)})},"highlightApi",0,{trigger:e=>i(`/api/highlight/${e}`,{method:"POST"}),triggerBatch:e=>i(`/api/highlight/batch/${e}`,{method:"POST"}),getHighlights:(e,t)=>{let a=t?`?page=${t}`:"";return i(`/api/highlight/${e}${a}`)},getHighlightsByPage:e=>i(`/api/highlight/by-page/${e}`),getStatus:e=>i(`/api/highlight/status/${e}`),getProgress:e=>i(`/api/highlight/progress/${e}`),getPageImage:(e,i,a)=>{let o=a?`?dpi=${a}`:"";return`${t}/api/highlight/page/${e}/${i}/image${o}`},saveImage:(e,t,a)=>i(`/api/highlight/${e}/save`,{method:"POST",body:JSON.stringify({page_number:t,image_base64:a})}),getSavedImages:e=>i(`/api/highlight/${e}/saved-images`)},"projectApi",0,{listProjects:()=>i("/api/projects"),createProject:e=>i("/api/projects",{method:"POST",body:JSON.stringify({name:e})}),deleteProject:e=>i(`/api/projects/${e}`,{method:"DELETE"}),getProject:e=>i(`/api/projects/${e}`),updateProject:(e,t)=>i(`/api/projects/${e}`,{method:"PATCH",body:JSON.stringify(t)})},"relationshipApi",0,{analyze:(e,t)=>{let a=t?`?beneficiary_name=${encodeURIComponent(t)}`:"";return i(`/api/relationship/${e}${a}`,{method:"POST"})},saveManual:(e,t)=>i(`/api/relationship-manual/${e}`,{method:"POST",body:JSON.stringify(t)}),getLatest:e=>i(`/api/projects/${e}/relationship`)},"styleTemplateApi",0,{parse:(e,t)=>i("/api/style-templates/parse",{method:"POST",body:JSON.stringify({section:e,sample_text:t})}),create:e=>i("/api/style-templates",{method:"POST",body:JSON.stringify(e)}),list:e=>{let t=e?`?section=${e}`:"";return i(`/api/style-templates${t}`)},get:e=>i(`/api/style-templates/${e}`),update:(e,t)=>i(`/api/style-templates/${e}`,{method:"PATCH",body:JSON.stringify(t)}),delete:e=>i(`/api/style-templates/${e}`,{method:"DELETE"})},"writingApi",0,{generateParagraph:(e,t,a)=>i(`/api/l1-write/${e}?section_type=${t}${a?`&beneficiary_name=${encodeURIComponent(a)}`:""}`,{method:"POST"}),saveManual:(e,t,a,o)=>i(`/api/l1-write-manual/${e}`,{method:"POST",body:JSON.stringify({section_type:t,paragraph_text:a,citations_used:o})}),getAllWriting:e=>i(`/api/l1-writing/${e}`)}])},83036,e=>{"use strict";var t=e.i(43476),i=e.i(71645);function a({message:e,type:a,duration:o=3e3,onClose:r}){let[n,s]=(0,i.useState)(!0);(0,i.useEffect)(()=>{let e=setTimeout(()=>{s(!1),setTimeout(r,300)},o);return()=>clearTimeout(e)},[o,r]);let l={success:(0,t.jsx)("svg",{className:"w-5 h-5",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M5 13l4 4L19 7"})}),error:(0,t.jsx)("svg",{className:"w-5 h-5",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M6 18L18 6M6 6l12 12"})}),info:(0,t.jsx)("svg",{className:"w-5 h-5",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"})}),warning:(0,t.jsx)("svg",{className:"w-5 h-5",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"})})};return(0,t.jsxs)("div",{className:`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 text-white rounded-lg shadow-lg transition-all duration-300 ${{success:"bg-green-500",error:"bg-red-500",info:"bg-blue-500",warning:"bg-yellow-500"}[a]} ${n?"opacity-100 translate-y-0":"opacity-0 translate-y-2"}`,children:[l[a],(0,t.jsx)("span",{children:e}),(0,t.jsx)("button",{onClick:()=>{s(!1),setTimeout(r,300)},className:"ml-2 p-1 hover:bg-white/20 rounded",children:(0,t.jsx)("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M6 18L18 6M6 6l12 12"})})})]})}e.s(["default",()=>a])},24994,e=>{"use strict";let t=`You are a Senior L-1 Immigration Paralegal. Your mission is to precisely extract key factual quotes from the document text provided below, based on the L-1 visa application standards.

**L-1 Visa: 4 Core Legal Requirements:**

1.  **Qualifying Corporate Relationship**
    * **Look for:** "parent", "subsidiary", "affiliate", "branch", "sister company", ownership percentages, stock structure, evidence of common control.
    * **Related Docs:** Articles of Incorporation, Stock Certificates, Bylaws.

2.  **Qualifying Employment Abroad**
    * **Look for:** Name of the foreign entity, job title, start/end dates of employment, evidence of at least 1 year of continuous work in the past 3 years.
    * **Related Docs:** Employment Contracts, Employment Verification Letters, Payroll records.

3.  **Qualifying Capacity**
    * **L-1A (Executive/Managerial):** "strategic planning", "directs the management", "manages a department", "supervises professionals", "personnel authority" (hire/fire), "budgetary control".
    * **L-1B (Specialized Knowledge):** "proprietary technology", "unique knowledge", "advanced processes", "difficult to transfer", "not commonly held".
    * **Related Docs:** Organizational Charts, detailed Job Descriptions, list of subordinates.

4.  **Doing Business (Active Operations)**
    * **Look for:** Commercial lease, rent payments, bank statements, account balance, sales contracts, invoices, number of employees, payroll expenses, EIN.

**Current Document Info:**
-   **Exhibit ID:** {exhibit_id}
-   **File Name:** {file_name}

**Output Format (JSON):**
You *must* return your answer *only* as a single JSON object. Return an empty \`quotes\` array \`[]\` if no relevant content is found in the text.

IMPORTANT: Use the Exhibit ID and File Name provided above in EVERY quote's source field.

{
  "quotes": [
    {
      "standard_en": "Qualifying Corporate Relationship",
      "standard_key": "qualifying_relationship",
      "quote": "The exact original quote from the text...",
      "relevance": "A brief explanation of how this quote supports the standard.",
      "page": 1,
      "source": {
        "exhibit_id": "{exhibit_id}",
        "file_name": "{file_name}"
      }
    }
  ]
}
`;function i(e){let i=t.replace("{exhibit_id}",e.exhibitId).replace("{file_name}",e.fileName);return`${i}
---

**Below is the OCR text extracted from the document. Please analyze it according to the instructions above:**

\`\`\`
${e.documentText}
\`\`\`
`}function a(e){return t.replace("{exhibit_id}",e.exhibitId).replace("{file_name}",e.fileName).replace("{document_text}",e.documentText)}let o={qualifying_relationship:`You are a Senior Immigration Attorney at a top-tier U.S. law firm. Your task is to write a persuasive, two-paragraph legal argument for the specific section: "QUALIFYING RELATIONSHIP BETWEEN FOREIGN PARENT COMPANY AND THE U.S. PETITIONER AND SUFFICIENT PHYSICAL PREMISES".

Your argument *must* be built by intelligently synthesizing *only* the relevant quotes from the Master Evidence List provided.

**1. Master Evidence List (JSON):**
[EVIDENCE_PLACEHOLDER]

**2. Key Entities:**
Petitioner: [PETITIONER_NAME] | Foreign Entity: [FOREIGN_ENTITY_NAME] | Beneficiary: [BENEFICIARY_NAME]

**3. Internal Guidance & Filtering Rules (CRITICAL):**
You *must* write two paragraphs addressing the two distinct legal points in the section title.

* **For Paragraph 1 (Qualifying Relationship):**
    * **Goal:** Prove the parent-subsidiary link and control.
    * **Filter For:** You *must* scan the *entire* Master List and select *only* quotes related to:
        * U.S. company formation date.
        * Stock ownership percentages.
        * Shareholder names.
        * Stock certificates, meeting minutes, and bylaws confirming ownership.
        * Tax forms confirming ownership.
        * Capital investments *from* the parent.
    * **Must Ignore:** Quotes about leases, employee counts, or revenue.

* **For Paragraph 2 (Sufficient Physical Premises):**
    * **Goal:** Prove the U.S. entity has a real, sufficient office/warehouse.
    * **Filter For:** You *must* scan the *entire* Master List and select *only* quotes related to:
        * The commercial lease agreement.
        * The physical street address.
        * The lease term (start/end dates).
        * Rent payment amounts and proof of payment (checks, bank statements).
        * Description of the space.
    * **Must Ignore:** Quotes about stock ownership, employee duties, or revenue.

**4. Strict Output Instructions:**

* **Persona:** You must write in formal, professional, and persuasive legal English.
* **NO MARKDOWN FORMATTING:** Do NOT use any Markdown formatting symbols like ** for bold, * for italics, or # for headers in the generated paragraph text. Output plain text only.
* **Citation Format (MANDATORY):** Every factual claim *must* be followed by a synthesized inline citation in the format \`[Exhibit {exhibit_id}: {file_name}]\`. Consolidate citations at the end of a sentence where appropriate.
* **Output Format (JSON):** You *must* provide your response as a single JSON object matching this exact structure.

\`\`\`json
{
  "paragraph_text": "The generated two-paragraph text. Paragraph 1 *must* prove the 'Qualifying Relationship'. Paragraph 2 *must* prove the 'Sufficient Physical Premises'.",
  "citations_used": [
    {
      "exhibit": "...",
      "file_name": "...",
      "quote": "The *specific quote* you filtered and used from the Master List...",
      "claim": "A brief summary of the fact this quote was used to support..."
    }
  ]
}
\`\`\``,qualifying_employment:`You are a Senior Immigration Attorney at a top-tier U.S. law firm. Your task is to write a persuasive, structurally complex legal narrative for the section: "BENEFICIARY'S QUALIFYING EMPLOYMENT ABROAD".

**THE OBJECTIVE:** You must write a comprehensive narrative using a specific "a, b, c, d" list structure to detail executive duties, mapping the Beneficiary's duties into distinct executive categories (Strategic, Operational, Financial, Representation).

**1. Master Evidence List (JSON):**
[EVIDENCE_PLACEHOLDER]

**2. Key Entities:**
Petitioner: [PETITIONER_NAME] | Foreign Entity: [FOREIGN_ENTITY_NAME] | Beneficiary: [BENEFICIARY_NAME]

**3. MANDATORY WRITING TEMPLATE (Strictly follow this formatting):**

Your output MUST contain THREE sections with the following structure:

---

**Section 1: The Continuous Nature of the Beneficiary's Employment and the Foreign Entity's Operations**

Write a paragraph proving:
- The beneficiary satisfies the regulatory requirement of at least one continuous year of employment within the three years preceding admission
- Include the job title and start date
- Corroborate with multiple documents (resume, business cards, historical documents)
- Cite official government records (pension, insurance, payroll) confirming continuous employment

---

**Section 2: Beneficiary's Executive Authority and Scope of Duties**

Start with: "In [his/her] role as [TITLE], [NAME] functions as the commander-in-general. Consistent with the complexities of the business, [he/she] performs the following executive duties:"

Then list duties in EXACTLY this a, b, c, d format:

a. Perform executive leadership and strategic direction. Determine business models and goals. (Approximately X% of Working Time)
   - [Specific duty with citation]
   - [Specific duty with citation]
   - Specific Evidence of Authority: [Concrete example with citation]

b. Oversee the integration and coordination of departmental operations. (Approximately X% of Working Time)
   - [Specific duty with citation]
   - [Specific duty with citation]

c. Evaluate financial strategies and determine significant funds expenditures. (Approximately X% of Working Time)
   - [Specific duty with citation]
   - Specific Evidence of Authority: [Concrete example with citation]

d. Formulate external relations strategies and corporate representation. (Approximately X% of Working Time)
   - [Specific duty with citation]
   - [Specific duty with citation]

---

**Section 3: Oversight of Professional and Managerial Staff**

Start with: "[NAME] directs the management of the organization through a team of subordinate managers and professionals. [He/She] directly supervises:"

Then list each subordinate with:
- Name and Title
- Educational qualifications (if available)
- Specific responsibilities under beneficiary's oversight
- Citation

End with salary information: "For these services, [NAME] receives an annual salary of approximately [AMOUNT]. [Citation]"

---

**4. Strict Output Instructions:**

* **Persona:** You must write in formal, professional, and persuasive legal English.
* **NO MARKDOWN FORMATTING:** Do NOT use any Markdown formatting symbols like ** for bold, * for italics, or # for headers in the generated paragraph text. Output plain text only.
* **Citation Format (MANDATORY):** Every factual claim *must* be followed by a synthesized inline citation in the format \`[Exhibit {exhibit_id}: {file_name}]\`.
* **Output Format (JSON):**

\`\`\`json
{
  "paragraph_text": "The complete three-section narrative following the template above...",
  "citations_used": [
    {
      "exhibit": "...",
      "file_name": "...",
      "quote": "The *specific quote* from the Master List...",
      "claim": "A brief summary of the fact this quote supports..."
    }
  ]
}
\`\`\``,qualifying_capacity:`You are a Senior Immigration Attorney at a top-tier U.S. law firm. Your task is to write a persuasive, two-paragraph legal argument for the specific section: "BENEFICIARY'S QUALIFYING CAPACITY - EXECUTIVE/MANAGERIAL ROLE".

Your argument *must* be built by intelligently synthesizing *only* the relevant quotes from the Master Evidence List provided.

**1. Master Evidence List (JSON):**
[EVIDENCE_PLACEHOLDER]

**2. Key Entities:**
Petitioner: [PETITIONER_NAME] | Foreign Entity: [FOREIGN_ENTITY_NAME] | Beneficiary: [BENEFICIARY_NAME]

**3. Internal Guidance & Filtering Rules (CRITICAL):**
You *must* write two paragraphs: one for the foreign role, one for the proposed U.S. role.

* **For Paragraph 1 (Foreign Position - Past/Current Role):**
    * **Goal:** Prove the beneficiary served in an executive or managerial capacity abroad.
    * **Filter For:**
        * Job title and department managed at the foreign entity.
        * Number and types of subordinates supervised.
        * Organizational chart showing the beneficiary's position.
        * Evidence of strategic decision-making authority.
        * Personnel authority (hiring, firing, performance reviews).
        * Budgetary or financial control.
    * **Must Ignore:** Quotes about U.S. lease, stock ownership, or proposed U.S. duties.

* **For Paragraph 2 (U.S. Position - Proposed Role):**
    * **Goal:** Prove the beneficiary will serve in an executive or managerial capacity in the U.S.
    * **Filter For:**
        * Proposed job title and duties in the U.S.
        * Proposed subordinates or reporting structure.
        * Strategic responsibilities in the U.S. operation.
        * Decision-making authority over U.S. operations.
    * **Must Ignore:** Quotes about foreign employment dates or stock ownership.

**4. Strict Output Instructions:**

* **Persona:** You must write in formal, professional, and persuasive legal English.
* **NO MARKDOWN FORMATTING:** Do NOT use any Markdown formatting symbols like ** for bold, * for italics, or # for headers in the generated paragraph text. Output plain text only.
* **Citation Format (MANDATORY):** Every factual claim *must* be followed by a synthesized inline citation in the format \`[Exhibit {exhibit_id}: {file_name}]\`.
* **Output Format (JSON):**

\`\`\`json
{
  "paragraph_text": "Two paragraphs: Paragraph 1 proves the foreign executive/managerial role. Paragraph 2 proves the proposed U.S. executive/managerial role.",
  "citations_used": [
    {
      "exhibit": "...",
      "file_name": "...",
      "quote": "The *specific quote* from the Master List...",
      "claim": "A brief summary of the fact this quote supports..."
    }
  ]
}
\`\`\``,doing_business:`You are a Senior Immigration Attorney at a top-tier U.S. law firm. Your task is to write a persuasive, two-paragraph legal argument for the specific section: "BOTH ENTITIES ARE ACTIVELY DOING BUSINESS".

Your argument *must* be built by intelligently synthesizing *only* the relevant quotes from the Master Evidence List provided.

**1. Master Evidence List (JSON):**
[EVIDENCE_PLACEHOLDER]

**2. Key Entities:**
Petitioner: [PETITIONER_NAME] | Foreign Entity: [FOREIGN_ENTITY_NAME] | Beneficiary: [BENEFICIARY_NAME]

**3. Internal Guidance & Filtering Rules (CRITICAL):**
You *must* write two paragraphs: one for the U.S. entity, one for the foreign entity.

* **For Paragraph 1 (U.S. Petitioner's Active Operations):**
    * **Goal:** Prove the U.S. company is actively doing business (not just a shell).
    * **Filter For:**
        * U.S. bank account statements showing transactions.
        * Revenue, sales contracts, or invoices.
        * Number of U.S. employees and payroll records.
        * Business licenses or permits.
        * EIN (Employer Identification Number).
        * Ongoing business activities or projects.
    * **Must Ignore:** Quotes about stock ownership or foreign operations.

* **For Paragraph 2 (Foreign Entity's Active Operations):**
    * **Goal:** Prove the foreign parent/affiliate is a real, ongoing business.
    * **Filter For:**
        * Foreign company registration or business license.
        * Financial statements or annual reports.
        * Number of employees at the foreign entity.
        * Revenue or profit figures.
        * Office locations or facilities abroad.
    * **Must Ignore:** Quotes about U.S. lease or U.S. bank statements.

**4. Strict Output Instructions:**

* **Persona:** You must write in formal, professional, and persuasive legal English.
* **NO MARKDOWN FORMATTING:** Do NOT use any Markdown formatting symbols like ** for bold, * for italics, or # for headers in the generated paragraph text. Output plain text only.
* **Citation Format (MANDATORY):** Every factual claim *must* be followed by a synthesized inline citation in the format \`[Exhibit {exhibit_id}: {file_name}]\`.
* **Output Format (JSON):**

\`\`\`json
{
  "paragraph_text": "Two paragraphs: Paragraph 1 proves U.S. Petitioner's active business. Paragraph 2 proves Foreign Entity's active business.",
  "citations_used": [
    {
      "exhibit": "...",
      "file_name": "...",
      "quote": "The *specific quote* from the Master List...",
      "claim": "A brief summary of the fact this quote supports..."
    }
  ]
}
\`\`\``};function r(e,t,i,a){let r=(o[e]||o.qualifying_relationship).replace("[EVIDENCE_PLACEHOLDER]",t).replace("[PETITIONER_NAME]",i.petitionerName||"[Petitioner]").replace("[FOREIGN_ENTITY_NAME]",i.foreignEntityName||"[Foreign Entity]").replace("[BENEFICIARY_NAME]",i.beneficiaryName||"[Beneficiary]");return a&&(r+=`

**5. WRITING STYLE TEMPLATE (IMPORTANT):**
You MUST follow the structure and writing style of the template below. Replace the placeholders with actual facts from the evidence, but preserve the rhetorical flow, sentence patterns, and professional tone.

\`\`\`
${a}
\`\`\`

Use this template as your structural guide. Match its:
- Sentence length and complexity
- Transition phrases and legal terminology
- Overall argumentation flow
- Citation placement patterns`),r}e.s(["SECTION_TYPES",0,[{key:"qualifying_relationship",label:"Qualifying Corporate Relationship & Physical Premises"},{key:"qualifying_employment",label:"Qualifying Employment Abroad"},{key:"qualifying_capacity",label:"Qualifying Capacity (L-1A/L-1B)"},{key:"doing_business",label:"Doing Business / Active Operations"}],"STANDARD_DISPLAY_NAMES",0,{qualifying_relationship:{chinese:"合格的公司关系",english:"Qualifying Corporate Relationship"},qualifying_employment:{chinese:"海外合格任职",english:"Qualifying Employment Abroad"},qualifying_capacity:{chinese:"合格的职位性质",english:"Qualifying Capacity"},doing_business:{chinese:"持续运营",english:"Doing Business"}},"generateAnalysisPrompt",()=>a,"generateCombinedPrompt",()=>i,"generateSectionWritingPrompt",()=>r])}]);