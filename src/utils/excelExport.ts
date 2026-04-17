import ExcelJS from 'exceljs';
import type { EventRecord } from '../types';
import { CATEGORIES } from '../constants';
import type { TaskPhase } from '../constants/taskTemplates';
import { FIRST_VISIT_PHASES, SECOND_VISIT_PHASES } from '../constants/taskTemplates';

// ─── BNP Brand palette (ARGB — full opacity prefix FF) ───────────────────
const P = {
  darkPurple:  'FF4C1D95',
  purple:      'FF7C3AED',
  midPurple:   'FFEDE9FE',
  lightPurple: 'FFF5F3FF',
  white:       'FFFFFFFF',
  darkText:    'FF1E1B4B',
  mutedText:   'FF6B7280',
  green:       'FF16A34A',
  lightGreen:  'FFF0FDF4',
  red:         'FFDC2626',
  lightRed:    'FFFEF2F2',
  amber:       'FFD97706',
  border:      'FFDDD6FE',
  borderDark:  'FF7C3AED',
} as const;

const CONSUMABLE_CATS = new Set([
  CATEGORIES.DRINKS, CATEGORIES.CONSUMABLES,
  CATEGORIES.VODKA,  CATEGORIES.WHISKEY, CATEGORIES.GIN,
  CATEGORIES.TEQUILA, CATEGORIES.RUM,   CATEGORIES.ANISE,
  CATEGORIES.APERITIF, CATEGORIES.BEER,  CATEGORIES.WINE,
]);

// ─── Style helpers ────────────────────────────────────────────────────────

function solidFill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function thinBorder(argb = P.border): Partial<ExcelJS.Borders> {
  const b = { style: 'thin' as ExcelJS.BorderStyle, color: { argb } };
  return { top: b, bottom: b, left: b, right: b };
}

function rtlCenter(cell: ExcelJS.Cell, argb = P.darkText, size = 11, bold = false) {
  cell.font      = { name: 'Calibri', size, bold, color: { argb } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rightToLeft' };
}

function rtlRight(cell: ExcelJS.Cell, argb = P.darkText, size = 11, bold = false) {
  cell.font      = { name: 'Calibri', size, bold, color: { argb } };
  cell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rightToLeft', indent: 1 };
}

// ─── Shared: add equipment sheet to an existing workbook ─────────────────

function addEquipmentSheet(wb: ExcelJS.Workbook, event: EventRecord, sheetName = 'דוח אירוע') {
  const ws = wb.addWorksheet(sheetName, {
    views:     [{ rightToLeft: true, showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  ws.columns = [
    { width: 22 }, { width: 34 }, { width: 10 }, { width: 10 },
    { width: 10 }, { width: 12 }, { width: 16 }, { width: 18 },
  ];

  let r = 1;

  ws.mergeCells(`A${r}:H${r}`);
  const titleCell = ws.getCell(`A${r}`);
  titleCell.value  = '✦  B&P COCKTAIL BAR  ✦  דוח אירוע רשמי';
  titleCell.fill   = solidFill(P.darkPurple);
  titleCell.border = thinBorder(P.borderDark);
  rtlCenter(titleCell, P.white, 20, true);
  ws.getRow(r).height = 50;
  r++;

  ws.mergeCells(`A${r}:H${r}`);
  const subtitle = ws.getCell(`A${r}`);
  subtitle.value  = 'BEACH, BUT PRIVATE — INVENTORY & EVENT REPORT';
  subtitle.fill   = solidFill(P.purple);
  subtitle.border = thinBorder(P.borderDark);
  rtlCenter(subtitle, P.white, 11);
  subtitle.font = { ...subtitle.font, italic: true };
  ws.getRow(r).height = 22;
  r++;

  const totalCost = event.items.reduce((sum, item) => {
    const diff = Math.max(0, item.quantityOut - item.quantityIn);
    return sum + diff * (item.price ?? 0);
  }, 0);

  const summaryRows: [string, string, string, string][] = [
    ['שם האירוע',    event.eventName,   'מנהל אירוע',  event.managerName],
    ['תאריך',        new Date(event.eventDate).toLocaleDateString('he-IL'),
     'סוג אירוע',   event.type === 'wedding' ? '💍 חתונה' : event.type === 'corporate' ? '🏢 חברה' : '🎉 פרטי'],
    ['סטטוס',        event.status === 'completed' ? '✅ הושלם ונסגר' : '⏳ פעיל',
     'סה"כ עלות',   `₪${totalCost.toLocaleString()}`],
    ['הופק בתאריך',  new Date().toLocaleDateString('he-IL'),
     'מספר פריטים', `${event.items.filter(i => i.quantityOut > 0 || i.isChecked).length} פריטים`],
  ];

  for (const [lbl1, val1, lbl2, val2] of summaryRows) {
    ws.getRow(r).height = 24;
    ws.mergeCells(`A${r}:B${r}`);
    const l1 = ws.getCell(`A${r}`);
    l1.value = lbl1; l1.fill = solidFill(P.darkPurple); l1.border = thinBorder();
    rtlRight(l1, P.white, 11, true);
    ws.mergeCells(`C${r}:D${r}`);
    const v1 = ws.getCell(`C${r}`);
    v1.value = val1; v1.fill = solidFill(P.midPurple); v1.border = thinBorder();
    rtlRight(v1, P.darkText, 12);
    const l2 = ws.getCell(`E${r}`);
    l2.value = lbl2; l2.fill = solidFill(P.darkPurple); l2.border = thinBorder();
    rtlRight(l2, P.white, 11, true);
    ws.mergeCells(`F${r}:H${r}`);
    const v2 = ws.getCell(`F${r}`);
    v2.value = val2; v2.fill = solidFill(P.midPurple); v2.border = thinBorder();
    rtlRight(v2, P.darkText, 12);
    r++;
  }

  ws.addRow([]); ws.getRow(r).height = 8; r++;

  const HEADERS = ['קטגוריה', 'שם הפריט', 'יצא', 'חזר', 'פער', 'מחיר ₪', 'עלות כוללת ₪', 'סטטוס'];
  const hdrRow = ws.addRow(HEADERS);
  hdrRow.height = 30;
  hdrRow.eachCell(cell => {
    cell.fill = solidFill(P.purple); cell.border = thinBorder(P.darkPurple);
    rtlCenter(cell, P.white, 12, true);
  });
  r++;

  const usedItems = event.items.filter(i => i.quantityOut > 0 || i.isChecked);

  usedItems.forEach((item, idx) => {
    const zebra = idx % 2 === 0 ? P.white : P.lightPurple;
    const isConsumable = CONSUMABLE_CATS.has(item.category);
    const qOut  = item.isChecked ? 1 : (item.quantityOut ?? 0);
    const qIn   = item.isChecked ? 1 : (item.quantityIn  ?? 0);
    const diff  = qOut - qIn;
    const cost  = Math.max(0, diff) * (item.price ?? 0);

    let statusText: string;
    let statusFg  = P.darkText;
    let statusBg  = zebra;

    if (item.itemType === 'checkbox') {
      statusText = item.isChecked ? '✓ נלקח' : '— לא נלקח';
      statusFg   = item.isChecked ? P.green : P.mutedText;
    } else if (qOut === 0) {
      statusText = '—';
    } else if (diff <= 0) {
      statusText = '✓ הוחזר הכל'; statusFg = P.green; statusBg = P.lightGreen;
    } else if (isConsumable) {
      statusText = `${diff} נצרך`; statusFg = P.mutedText;
    } else {
      statusText = `⚠ חסר ${diff}`; statusFg = P.red; statusBg = P.lightRed;
    }

    const displayName = item.selectedVariant ? `${item.name} (${item.selectedVariant})` : item.name;

    const rowData: (string | number)[] = [
      item.category, displayName,
      item.isChecked ? '✓' : (qOut  || 0),
      item.isChecked ? '✓' : (qIn   || 0),
      item.isChecked ? '—' : (diff !== 0 ? diff : '✓'),
      item.price ? item.price : '—',
      cost > 0 ? cost : '—',
      statusText,
    ];

    const dataRow = ws.addRow(rowData);
    dataRow.height = 21;
    dataRow.eachCell((cell, colNum) => {
      const bg  = colNum === 8 ? statusBg : zebra;
      const fg  = colNum === 8 ? statusFg : (colNum <= 2 ? P.darkText : P.mutedText);
      cell.fill   = solidFill(bg);
      cell.border = thinBorder();
      cell.font   = { name: 'Calibri', size: 11, bold: colNum <= 2, color: { argb: fg } };
      cell.alignment = { horizontal: colNum <= 2 ? 'right' : 'center', vertical: 'middle', readingOrder: 'rightToLeft', indent: colNum <= 2 ? 1 : 0 };
      if ((colNum === 6 || colNum === 7) && typeof cell.value === 'number') cell.numFmt = '₪#,##0.00';
    });
    r++;
  });

  ws.addRow([]); ws.getRow(r).height = 10; r++;

  ws.mergeCells(`A${r}:F${r}`);
  const totalLabel = ws.getCell(`A${r}`);
  totalLabel.value = 'סה"כ עלות האירוע';
  totalLabel.fill  = solidFill(P.darkPurple); totalLabel.border = thinBorder(P.borderDark);
  rtlRight(totalLabel, P.white, 14, true);
  ws.getRow(r).height = 38;
  ws.mergeCells(`G${r}:H${r}`);
  const totalVal = ws.getCell(`G${r}`);
  totalVal.value = totalCost; totalVal.numFmt = '₪#,##0.00';
  totalVal.fill  = solidFill(P.purple); totalVal.border = thinBorder(P.borderDark);
  rtlCenter(totalVal, P.white, 18, true);
  r++;

  const missingItems = usedItems.filter(i =>
    !CONSUMABLE_CATS.has(i.category) && i.itemType !== 'checkbox' && !i.isFlatFee &&
    i.category !== CATEGORIES.ADDITIONAL_COSTS && i.category !== CATEGORIES.EMPLOYEES &&
    i.quantityOut > 0 && i.quantityIn < i.quantityOut
  );

  if (missingItems.length > 0) {
    ws.addRow([]); r++;
    ws.mergeCells(`A${r}:H${r}`);
    const warnHeader = ws.getCell(`A${r}`);
    warnHeader.value = `⚠  ציוד שלא הוחזר (${missingItems.length} פריטים)`;
    warnHeader.fill  = solidFill('FFFEF3C7'); warnHeader.border = thinBorder('FFF59E0B');
    rtlCenter(warnHeader, 'FFB45309', 13, true);
    ws.getRow(r).height = 26; r++;

    missingItems.forEach(item => {
      ws.mergeCells(`A${r}:D${r}`);
      const nameCell = ws.getCell(`A${r}`);
      nameCell.value = `• ${item.name}`; nameCell.fill = solidFill('FFFFF7ED'); nameCell.border = thinBorder('FFFBBF24');
      rtlRight(nameCell, 'FF92400E', 11);
      ws.mergeCells(`E${r}:H${r}`);
      const detailCell = ws.getCell(`E${r}`);
      detailCell.value = `יצא: ${item.quantityOut}  |  חזר: ${item.quantityIn}  |  חסר: ${item.quantityOut - item.quantityIn}`;
      detailCell.fill  = solidFill('FFFFF7ED'); detailCell.border = thinBorder('FFFBBF24');
      rtlCenter(detailCell, 'FFDC2626', 11, true);
      ws.getRow(r).height = 20; r++;
    });
  }

  ws.addRow([]); r++;
  ws.mergeCells(`A${r}:H${r}`);
  const footer = ws.getCell(`A${r}`);
  footer.value = `© ${new Date().getFullYear()} B&P Cocktail Bar — כל הזכויות שמורות | הופק ע"י מערכת ניהול המלאי`;
  footer.font  = { name: 'Calibri', italic: true, size: 9, color: { argb: P.mutedText } };
  footer.alignment = { horizontal: 'center', vertical: 'middle' };
}

// ─── Shared: add task sheet to an existing workbook ───────────────────────

function addTaskSheet(wb: ExcelJS.Workbook, event: EventRecord, phases: TaskPhase[], sheetTitle: string) {
  const ws = wb.addWorksheet(sheetTitle, {
    views:     [{ rightToLeft: true, showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.columns = [{ width: 28 }, { width: 50 }, { width: 16 }, { width: 16 }];

  ws.mergeCells('A1:D1');
  const t = ws.getCell('A1');
  t.value = `BNP — ${sheetTitle} | ${event.eventName} | ${new Date(event.eventDate).toLocaleDateString('he-IL')}`;
  t.fill  = solidFill(P.darkPurple);
  t.font  = { name: 'Calibri', bold: true, size: 14, color: { argb: P.white } };
  t.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rightToLeft' };
  ws.getRow(1).height = 32;

  // Column headers
  const hdrRow = ws.addRow(['שלב', 'משימה', 'אחראי', 'סטטוס']);
  hdrRow.height = 26;
  hdrRow.eachCell(cell => {
    cell.fill = solidFill(P.purple); cell.border = thinBorder(P.darkPurple);
    cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: P.white } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rightToLeft' };
  });

  const tasksDone = event.tasksDone ?? {};
  let r = 3;

  for (const phase of phases) {
    // Phase header
    ws.mergeCells(`A${r}:D${r}`);
    const ph = ws.getCell(`A${r}`);
    ph.value = `${phase.emoji}  ${phase.label}`;
    ph.fill  = solidFill(P.darkPurple);
    ph.font  = { name: 'Calibri', bold: true, size: 13, color: { argb: P.white } };
    ph.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rightToLeft' };
    ws.getRow(r).height = 28; r++;

    for (const stage of phase.stages) {
      ws.mergeCells(`A${r}:D${r}`);
      const sh = ws.getCell(`A${r}`);
      sh.value = stage.name;
      sh.fill  = solidFill(P.midPurple); sh.border = thinBorder(P.borderDark);
      sh.font  = { name: 'Calibri', bold: true, size: 11, color: { argb: P.darkPurple } };
      sh.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rightToLeft', indent: 1 };
      ws.getRow(r).height = 24; r++;

      for (const task of stage.tasks) {
        const done = !!tasksDone[task.id];
        const zebra = r % 2 === 0 ? P.white : P.lightPurple;
        const row = ws.addRow([stage.name, task.task, task.responsible ?? '', done ? '✅ בוצע' : '❌ לא בוצע']);
        row.height = 20;
        row.eachCell((cell, col) => {
          cell.fill   = solidFill(done ? P.lightGreen : zebra);
          cell.border = thinBorder();
          cell.font   = { name: 'Calibri', size: 10, color: { argb: col === 4 ? (done ? P.green : P.red) : P.darkText } };
          cell.alignment = { horizontal: col <= 2 ? 'right' : 'center', vertical: 'middle', readingOrder: 'rightToLeft', indent: col <= 2 ? 1 : 0 };
        });
        r++;
      }
    }
  }

  // Summary row
  const allTasks  = phases.flatMap(p => p.stages.flatMap(s => s.tasks));
  const doneCount = allTasks.filter(t => !!tasksDone[t.id]).length;
  ws.addRow([]); r++;
  ws.mergeCells(`A${r}:D${r}`);
  const sumRow = ws.getCell(`A${r}`);
  sumRow.value = `סה"כ: ${doneCount} / ${allTasks.length} משימות בוצעו`;
  sumRow.fill  = solidFill(doneCount === allTasks.length ? P.green : P.amber);
  sumRow.font  = { name: 'Calibri', bold: true, size: 12, color: { argb: P.white } };
  sumRow.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rightToLeft' };
  ws.getRow(r).height = 28;
}

// ─── Local download: one workbook with all 4 sheets ──────────────────────

export async function exportEventToExcel(event: EventRecord): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'BNP Cocktail Bar';
  wb.created  = new Date();
  wb.modified = new Date();

  addEquipmentSheet(wb, event, 'סיכום ציוד');
  addTaskSheet(wb, event, [FIRST_VISIT_PHASES.find(p => p.id === 'warehouse_loading')!], 'העמסת מחסן');
  addTaskSheet(wb, event, [FIRST_VISIT_PHASES.find(p => p.id === 'event_arrival')!],    'הגעה לאירוע');
  addTaskSheet(wb, event, SECOND_VISIT_PHASES,                                            'פירוק אירוע');

  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href       = url;
  a.download   = `BNP_${event.eventName.replace(/\s+/g, '_')}_${event.eventDate}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Drive: summary workbook (buffer only) ────────────────────────────────

export async function buildEventWorkbook(event: EventRecord): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BNP Cocktail Bar';
  addEquipmentSheet(wb, event, 'סיכום ציוד');
  return wb.xlsx.writeBuffer();
}

// ─── Drive: task workbook (buffer only) ──────────────────────────────────

export async function buildTaskWorkbook(
  event: EventRecord,
  phases: TaskPhase[],
  sheetTitle: string
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BNP Cocktail Bar';
  addTaskSheet(wb, event, phases, sheetTitle);
  return wb.xlsx.writeBuffer();
}
