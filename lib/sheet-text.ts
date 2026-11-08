import ExcelJS from 'exceljs';

/** True for Excel workbooks we can read (.xlsx and .xlsm). Old binary .xls is not supported. */
export function isWorkbook(name: string, type = ''): boolean {
  const lower = name.toLowerCase();
  return (
    lower.endsWith('.xlsx') ||
    lower.endsWith('.xlsm') ||
    type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    type === 'application/vnd.ms-excel.sheet.macroEnabled.12'
  );
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    // Formulas keep their last calculated result; rich text and links keep their text.
    if ('result' in value) return cellText((value as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue);
    if ('richText' in value) return (value as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join('');
    if ('text' in value) return String((value as ExcelJS.CellHyperlinkValue).text);
    if ('error' in value) return '';
    return '';
  }
  return String(value);
}

function csvField(text: string): string {
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Turns every sheet of a workbook into labeled CSV text, so Claude reads an Excel P&L
 * the same way it reads a CSV export. Formulas are replaced by their saved values.
 */
export async function workbookToText(data: ArrayBuffer): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data);
  const parts: string[] = [];
  workbook.eachSheet((sheet) => {
    if (sheet.state && sheet.state !== 'visible') return;
    const lines: string[] = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      const cells = values.map((v) => csvField(cellText(v as ExcelJS.CellValue).trim()));
      while (cells.length && !cells[cells.length - 1]) cells.pop();
      if (cells.length) lines.push(cells.join(','));
    });
    if (lines.length) parts.push(`Sheet: ${sheet.name}\n${lines.join('\n')}`);
  });
  return parts.join('\n\n');
}
