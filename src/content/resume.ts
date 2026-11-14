import type { Content } from './schema';
// Standard PDF Helvetica supports Western Latin through Windows-1252. Octal
// escapes keep the document itself ASCII, so xref offsets remain byte-correct.
const winAnsi = new Map(
  [...'€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'].map((character, index) => [
    character,
    [
      128, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 142, 145, 146, 147, 148, 149, 150,
      151, 152, 153, 154, 155, 156, 158, 159,
    ][index],
  ]),
);
const pdfText = (text: string) =>
  [
    ...text
      .normalize('NFC')
      .replace(/\r\n?/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/−/g, '-')
      .replace(/→/g, ' -> '),
  ]
    .filter(
      (character) =>
        character === '\n' || /[\x20-\x7e\u00a0-\u00ff]/.test(character) || winAnsi.has(character),
    )
    .join('');
const upper = [
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667,
  611, 722, 667, 944, 667, 667, 611,
];
const lower = [
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500,
  278, 556, 500, 722, 500, 500, 500,
];
const widths: Record<string, number> = {
  ...Object.fromEntries(
    [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((letter, index) => [letter, upper[index]]),
  ),
  ...Object.fromEntries(
    [...'abcdefghijklmnopqrstuvwxyz'].map((letter, index) => [letter, lower[index]]),
  ),
  ' ': 278,
  '!': 278,
  '"': 355,
  '#': 556,
  $: 556,
  '%': 889,
  '&': 667,
  "'": 191,
  '(': 333,
  ')': 333,
  '*': 389,
  '+': 584,
  ',': 278,
  '-': 333,
  '.': 278,
  '/': 278,
  ':': 278,
  ';': 278,
  '<': 584,
  '=': 584,
  '>': 584,
  '?': 556,
  '@': 1015,
  '[': 278,
  '\\': 278,
  ']': 278,
  '^': 469,
  _: 556,
  '`': 333,
  '{': 334,
  '|': 260,
  '}': 334,
  '~': 584,
  Æ: 1000,
  æ: 889,
  Ð: 722,
  ð: 556,
  Ø: 778,
  ø: 611,
  Þ: 667,
  þ: 556,
  ß: 611,
  Œ: 1000,
  œ: 944,
  '€': 556,
  '…': 1000,
  '–': 556,
  '—': 1000,
  '™': 1000,
  '•': 350,
};
const glyphWidth = (character: string) =>
  widths[character] ??
  (/\d/.test(character) ? 556 : (widths[character.normalize('NFD')[0]] ?? 1015));
// Widths are Helvetica font units; at 10 pt, 52,800 units fit the 528 pt area.
function wrap(text: string) {
  const result: string[] = [];
  const maximum = 52_800;
  for (const paragraph of pdfText(text).split('\n')) {
    let line = '';
    let width = 0;
    for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      const wordWidth = [...word].reduce((total, character) => total + glyphWidth(character), 0);
      if (line && width + widths[' '] + wordWidth <= maximum) {
        line += ' ' + word;
        width += widths[' '] + wordWidth;
        continue;
      }
      if (line) {
        result.push(line);
        line = '';
        width = 0;
      }
      for (const character of word) {
        const nextWidth = glyphWidth(character);
        if (width + nextWidth > maximum) {
          result.push(line);
          line = '';
          width = 0;
        }
        line += character;
        width += nextWidth;
      }
    }
    result.push(line);
  }
  return result;
}
function pdfString(text: string) {
  return [...pdfText(text)]
    .map((character) => {
      const byte = winAnsi.get(character) ?? character.charCodeAt(0);
      return byte > 127
        ? `\\${byte.toString(8).padStart(3, '0')}`
        : character.replace(/([\\()])/g, '\\$1');
    })
    .join('');
}
export function createResume(content: Content): Blob {
  const lines = [
    content.profile.name,
    content.profile.headline,
    content.profile.location,
    content.profile.email,
    ...(content.profile.phone ? ['Phone: ' + content.profile.phone] : []),
    ...content.socialLinks.filter((link) => link.enabled).sort((a, b) => a.order - b.order).map((link) => link.url),
    '',
    ...wrap(content.profile.about),
    '',
    'EDUCATION',
    ...content.profile.education.flatMap((e) => [
      e.school,
      ...wrap(e.degree + ' | ' + e.period + ' | ' + e.detail),
    ]),
    '',
    'PROJECTS',
    ...content.projects
      .filter((p) => p.status === 'published')
      .sort((a, b) => a.order - b.order)
      .flatMap((p) => [
        p.title + ' | ' + p.year,
        ...wrap(p.description),
        'Technologies: ' + p.technologies.join(', '),
        ...p.outcomes.flatMap((o) => wrap(o.value + ' ' + o.label + ' - ' + o.context)),
        ...[p.githubUrl, p.liveUrl, p.caseStudyUrl].filter(Boolean),
        '',
      ]),
    'SKILLS',
    ...content.skills.flatMap((g) =>
      wrap(g.category + ': ' + g.items.map((i) => i.name).join(', ')),
    ),
    '',
    'RESEARCH',
    ...content.research
      .filter((r) => r.status === 'published')
      .flatMap((r) => [...wrap(r.title), r.publication + ' | ' + r.date, ...wrap(r.description)]),
  ].flatMap((line) => wrap(line));
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += 48) pages.push(lines.slice(i, i + 48));
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  const ids: number[] = [];
  for (const page of pages) {
    const id = objects.length + 1;
    ids.push(id);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${id + 1} 0 R >>`,
    );
    const stream =
      'BT /F1 10 Tf 14 TL 42 750 Td\n' +
      page.map((line, i) => (i ? 'T* ' : '') + '(' + pdfString(line) + ') Tj').join('\n') +
      '\nET';
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }
  objects[1] = `<< /Type /Pages /Kids [${ids.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf +=
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((o) => `${String(o).padStart(10, '0')} 00000 n \n`)
      .join('') +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}
