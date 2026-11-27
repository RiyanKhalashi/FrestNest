// Wording of the cover and the two declaration pages, shared by build.mjs (Word) and preview.mjs (PDF).
// The declarations follow the format the user supplied on 2026-11-26.

export const submissionStatement = (meta) =>
  `This project report has been submitted in partial fulfillment of the requirements for the degree of Bachelor of Science in ${meta.department}.`;

export const SIGNATURE_LINE = "_______________________________";
export const DATE_LINE = "Date: ____________________";

export function declarations(meta) {
  return [
    {
      title: "SUPERVISOR’S DECLARATION",
      text: `I hereby declare that I have examined this project report. In my opinion, the work submitted in this report is sufficient in academic standard, scope, depth and quality for the award of the degree of Bachelor of Science in ${meta.department}.`,
      signature: "(Supervisor’s Signature)",
      fields: [`Full Name: ${meta.supervisorName}`, `Designation: ${meta.supervisorDesignation}`, DATE_LINE],
    },
    {
      title: "STUDENT’S DECLARATION",
      text: `I hereby declare that the work presented in this project report is my own, except where quotations and citations are acknowledged. I also declare that this report has not been submitted previously, in whole or in part, for any other degree at ${meta.university} or any other institution.`,
      signature: "(Student’s Signature)",
      fields: [`Full Name: ${meta.studentName.toUpperCase()}`, `ID Number: ${meta.studentId}`, DATE_LINE],
    },
  ];
}
