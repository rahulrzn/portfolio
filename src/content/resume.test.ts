import { describe, expect, it } from 'vitest';
import { defaults } from './defaults';
import { createResume } from './resume';

function pdfBytes(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(String.fromCharCode(...new Uint8Array(reader.result as ArrayBuffer)));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}
function printedLines(pdf: string) {
  return [...pdf.matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)].map((match) =>
    match[1]
      .replace(/\\([0-7]{3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)))
      .replace(/\\([\\()])/g, '$1'),
  );
}

describe('generated public resume', () => {
  it('prints configured phone contact details and omits an empty phone', async () => {
    const content = structuredClone(defaults);
    content.profile.phone = '+91 98765 43210';
    expect(printedLines(await pdfBytes(createResume(content)))).toContain('Phone: +91 98765 43210');
    content.profile.phone = '';
    expect(printedLines(await pdfBytes(createResume(content))).some(line => line.startsWith('Phone:'))).toBe(false);
  });
  it('preserves Latin accented names, including combining accents, in the PDF font encoding', async () => {
    const content = structuredClone(defaults);
    content.profile.name = 'Rene\u0301e Åsa José Müller';
    const pdf = await pdfBytes(createResume(content));
    expect(printedLines(pdf)[0]).toBe('Renée Åsa José Müller');
    expect(pdf).toContain('/Encoding /WinAnsiEncoding');
  });
  it('breaks long words before Helvetica text can extend beyond the page margins', async () => {
    const content = structuredClone(defaults);
    content.projects[0].title = 'W'.repeat(150);
    const lines = printedLines(await pdfBytes(createResume(content)));
    const counts = lines.map((line) => (line.match(/W/g) ?? []).length);
    // Helvetica W is 9.44 pt at 10 pt; the 528 pt text area holds at most 55.
    expect(Math.max(...counts)).toBeLessThanOrEqual(55);
    expect(lines.join('')).toContain('W'.repeat(150));
  });
  it('keeps byte offsets and stream lengths valid when names contain accents and PDF delimiters', async () => {
    const content = structuredClone(defaults);
    content.profile.name = 'José (Reji) \\ résumé';
    const pdf = await pdfBytes(createResume(content));
    expect(printedLines(pdf)[0]).toBe('José (Reji) \\ résumé');
    const xref = Number(pdf.match(/startxref\n(\d+)/)?.[1]);
    expect(pdf.slice(xref, xref + 4)).toBe('xref');
    const offsets = [...pdf.slice(xref).matchAll(/(\d{10}) 00000 n/g)].map((match) =>
      Number(match[1]),
    );
    offsets.forEach((offset, index) =>
      expect(pdf.slice(offset, offset + `${index + 1} 0 obj`.length)).toBe(`${index + 1} 0 obj`),
    );
    for (const match of pdf.matchAll(/<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/g))
      expect(match[2].length).toBe(Number(match[1]));
  });
});
