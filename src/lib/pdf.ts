/**
 * Minimal, dependency-free PDF writer used to generate real, downloadable
 * syllabus and study-material documents in demo mode.
 *
 * Production note: replace this with properly stored PDFs uploaded by faculty
 * (see README → "Enabling persistent storage & real file uploads").
 */

type Block = { text: string; size: number; gap: number };

const PAGE_HEIGHT = 842;
const MARGIN_X = 56;

function escapeText(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    // PDF core fonts are WinAnsi; fall back to a readable approximation.
    .replace(/[^\x20-\x7E]/g, "?");
}

export function buildPdf(_title: string, blocks: Block[]): Buffer {
  let stream = "BT\n";
  let y = PAGE_HEIGHT - 70;

  for (const block of blocks) {
    if (y < 70) break;
    stream += `/F1 ${block.size} Tf\n`;
    stream += `${MARGIN_X} ${y} Td\n`;
    stream += `(${escapeText(block.text)}) Tj\n`;
    y -= block.gap;
    // Move the text cursor back up to absolute coordinates for the next block.
    stream += `ET\nBT\n`;
  }
  stream += "ET\n";

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.forEach((off) => {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}
