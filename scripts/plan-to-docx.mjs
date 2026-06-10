import { createRequire } from "module";
import fs from "fs";

const require = createRequire("C:/Users/sjmma/AppData/Roaming/npm/node_modules/");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType,
  ShadingType, Header, Footer, PageNumber,
} = require("docx");

const SRC = "C:/Users/sjmma/Projects/zwb-platform/PLAN.md";
const OUT = "C:/Users/sjmma/Projects/zwb-platform/docs/ZWB-platform-plan.docx";

const CONTENT_WIDTH = 9026; // A4, 1 inch margins

const raw = fs.readFileSync(SRC, "utf8").replace(/\r\n/g, "\n");
const lines = raw.split("\n");

// ---- inline parser: **bold**, `code`, plain ----
function parseInline(text, baseOpts = {}) {
  const runs = [];
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let last = 0, m;
  const pushPlain = (s) => { if (s) runs.push(new TextRun({ text: s, ...baseOpts })); };
  while ((m = re.exec(text)) !== null) {
    pushPlain(text.slice(last, m.index));
    if (m[2] !== undefined) {
      runs.push(new TextRun({ text: m[2], bold: true, ...baseOpts }));
    } else if (m[3] !== undefined) {
      runs.push(new TextRun({ text: m[3], font: "Consolas", size: 20, color: "9C2A4A", ...baseOpts }));
    }
    last = re.lastIndex;
  }
  pushPlain(text.slice(last));
  if (runs.length === 0) runs.push(new TextRun({ text: "", ...baseOpts }));
  return runs;
}

const children = [];

// Title block
children.push(new Paragraph({
  heading: HeadingLevel.TITLE,
  spacing: { after: 120 },
  children: [new TextRun({ text: "ZWB Platform — Plan & Status", bold: true })],
}));
children.push(new Paragraph({
  spacing: { after: 360 },
  children: [new TextRun({
    text: `Gegenereerd ${new Date().toISOString().slice(0, 10)} uit PLAN.md — levend document voor het ZWB-platformteam`,
    italics: true, color: "666666", size: 20,
  })],
}));

function isTableSep(s) { return /^\|?\s*:?-{2,}.*\|/.test(s.trim()) && s.includes("-"); }
function splitRow(s) {
  let t = s.trim();
  if (t.startsWith("|")) t = t.slice(1);
  if (t.endsWith("|")) t = t.slice(0, -1);
  return t.split("|").map((c) => c.trim());
}

let i = 0;
let skippedTitle = false;
while (i < lines.length) {
  let line = lines[i];
  const trimmed = line.trim();

  // blank
  if (trimmed === "") { i++; continue; }

  // horizontal rule
  if (/^---+$/.test(trimmed)) {
    children.push(new Paragraph({
      spacing: { before: 120, after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1F6F7A", space: 1 } },
      children: [new TextRun("")],
    }));
    i++; continue;
  }

  // headings
  const h = trimmed.match(/^(#{1,4})\s+(.*)$/);
  if (h) {
    const level = h[1].length;
    // skip the leading H1 title — we already rendered a title block
    if (level === 1 && !skippedTitle) { skippedTitle = true; i++; continue; }
    const map = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3, 4: HeadingLevel.HEADING_4 };
    children.push(new Paragraph({
      heading: map[level],
      spacing: { before: level <= 2 ? 280 : 200, after: 120 },
      children: parseInline(h[2]),
    }));
    i++; continue;
  }

  // blockquote (possibly multi-line)
  if (trimmed.startsWith(">")) {
    const buf = [];
    while (i < lines.length && lines[i].trim().startsWith(">")) {
      buf.push(lines[i].trim().replace(/^>\s?/, ""));
      i++;
    }
    // join into paragraphs separated by blank quote lines
    const blocks = buf.join("\n").split(/\n\s*\n/);
    for (const b of blocks) {
      const txt = b.replace(/\n/g, " ").trim();
      if (!txt) continue;
      children.push(new Paragraph({
        spacing: { after: 80 },
        indent: { left: 360 },
        border: { left: { style: BorderStyle.SINGLE, size: 18, color: "C9A227", space: 12 } },
        children: parseInline(txt, { italics: true, color: "555555", size: 20 }),
      }));
    }
    continue;
  }

  // table
  if (trimmed.startsWith("|") && i + 1 < lines.length && isTableSep(lines[i + 1])) {
    const header = splitRow(lines[i]);
    const aligns = splitRow(lines[i + 1]).map((c) => {
      const l = c.startsWith(":"), r = c.endsWith(":");
      if (l && r) return AlignmentType.CENTER;
      if (r) return AlignmentType.RIGHT;
      return AlignmentType.LEFT;
    });
    i += 2;
    const rows = [];
    while (i < lines.length && lines[i].trim().startsWith("|")) {
      rows.push(splitRow(lines[i])); i++;
    }
    const nCols = header.length;
    // width distribution: narrow first/last numeric/status columns
    const weights = header.map((hname) => {
      const n = hname.toLowerCase();
      if (n === "#" || n === "status" || n === "fase" || n === "spoor") return 1;
      return 4;
    });
    const wsum = weights.reduce((a, b) => a + b, 0);
    const colWidths = weights.map((w) => Math.round((w / wsum) * CONTENT_WIDTH));
    // fix rounding to sum exactly
    colWidths[colWidths.length - 1] += CONTENT_WIDTH - colWidths.reduce((a, b) => a + b, 0);

    const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
    const borders = { top: border, bottom: border, left: border, right: border };
    const mkCell = (text, idx, isHeader) => new TableCell({
      borders,
      width: { size: colWidths[idx], type: WidthType.DXA },
      shading: { fill: isHeader ? "1F6F7A" : "FFFFFF", type: ShadingType.CLEAR },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [new Paragraph({
        alignment: aligns[idx] || AlignmentType.LEFT,
        children: parseInline(text, isHeader ? { bold: true, color: "FFFFFF" } : {}),
      })],
    });
    const tableRows = [
      new TableRow({ tableHeader: true, children: header.map((c, idx) => mkCell(c, idx, true)) }),
      ...rows.map((r) => new TableRow({
        children: header.map((_, idx) => mkCell(r[idx] ?? "", idx, false)),
      })),
    ];
    children.push(new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: colWidths,
      rows: tableRows,
    }));
    children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }));
    continue;
  }

  // ordered list item:  "1. text"  (with following indented continuation / sub-bullets)
  const ol = line.match(/^(\d+)\.\s+(.*)$/);
  if (ol) {
    children.push(new Paragraph({
      numbering: { reference: "ol", level: 0 },
      spacing: { before: 80, after: 40 },
      children: parseInline(ol[2]),
    }));
    i++;
    // consume indented continuation lines belonging to this item
    while (i < lines.length) {
      const sub = lines[i];
      if (sub.trim() === "") { i++; continue; }
      const indent = sub.match(/^(\s+)/);
      if (!indent) break;
      const subTrim = sub.trim();
      const subBullet = subTrim.match(/^-\s+(.*)$/);
      if (subBullet) {
        const depth = indent[1].length >= 5 ? 1 : 0;
        children.push(new Paragraph({
          numbering: { reference: "ulx", level: depth },
          spacing: { after: 20 },
          children: parseInline(subBullet[1]),
        }));
        i++;
      } else {
        // continuation text of previous bullet/number
        children.push(new Paragraph({
          indent: { left: 1080 },
          spacing: { after: 20 },
          children: parseInline(subTrim),
        }));
        i++;
      }
    }
    continue;
  }

  // bullet list item (top-level)
  const ul = line.match(/^(\s*)-\s+(.*)$/);
  if (ul) {
    const depth = ul[1].length >= 2 ? 1 : 0;
    children.push(new Paragraph({
      numbering: { reference: "ul", level: depth },
      spacing: { after: 30 },
      children: parseInline(ul[2]),
    }));
    i++;
    // continuation lines (wrapped bullet text) indented under it
    while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !lines[i].trim().startsWith("-")) {
      children.push(new Paragraph({
        numbering: { reference: "ul", level: depth },
        spacing: { after: 30 },
        children: parseInline(lines[i].trim()),
      }));
      // actually merge into same bullet: simpler to keep as continuation paragraph
      i++;
    }
    continue;
  }

  // plain paragraph
  children.push(new Paragraph({
    spacing: { after: 80 },
    children: parseInline(trimmed),
  }));
  i++;
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Calibri", size: 22 } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 44, bold: true, color: "1F6F7A", font: "Calibri" },
        paragraph: { spacing: { after: 120 } } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: "1F6F7A", font: "Calibri" },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 27, bold: true, color: "245F69", font: "Calibri" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: "333333", font: "Calibri" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
      { id: "Heading4", name: "Heading 4", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, italics: true, color: "555555", font: "Calibri" },
        paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 3 } },
    ],
  },
  numbering: {
    config: [
      { reference: "ol", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 520, hanging: 360 } } } },
      ] },
      { reference: "ul", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 460, hanging: 280 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 900, hanging: 280 } } } },
      ] },
      { reference: "ulx", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 280 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1480, hanging: 280 } } } },
      ] },
    ],
  },
  sections: [{
    properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "ZWB Platform — Plan & Status   ·   pagina ", size: 18, color: "888888" }),
          new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888" }),
        ],
      })] }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log("Wrote", OUT, buf.length, "bytes");
});
