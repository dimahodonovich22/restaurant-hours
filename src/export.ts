import * as XLSX from 'xlsx';
import type { Entry, Worker } from './types';
import { ddmm, entryHours, entryPay, formatMonthLabel } from './calc';

export function exportExcel(worker: Worker, entries: Entry[], monthKey: string): void {
  const sorted = entries.slice().sort((a, b) => (a.date < b.date ? -1 : 1));

  let totalHours = 0;
  let totalPay = 0;

  const rows = sorted.map((e) => {
    const hours = entryHours(e);
    const sum = entryPay(e, worker);
    totalHours += hours;
    totalPay += sum;
    const times = [
      `${e.start}–${e.end}`,
      ...(e.extraSegments?.map((s) => `${s.start}–${s.end}`) ?? []),
    ].join(' · ');
    return {
      Дата: ddmm(e.date),
      Ділянка: e.comment ?? '',
      Час: times,
      'Години': hours,
      'Сума €': sum,
    };
  });

  totalPay = Math.round(totalPay * 100) / 100;

  rows.push({
    Дата: '',
    Ділянка: 'РАЗОМ',
    Час: '',
    Години: Math.round(totalHours * 100) / 100,
    'Сума €': totalPay,
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 8 },  // дата
    { wch: 16 }, // ділянка
    { wch: 18 }, // час
    { wch: 8 },  // години
    { wch: 12 }, // сума
  ];

  // Жирная нижняя строка с итогами
  const lastRow = rows.length + 1; // +1 для заголовка
  ['A','B','C','D','E'].forEach((col) => {
    const cell = ws[`${col}${lastRow}`];
    if (cell) {
      cell.s = { font: { bold: true } };
    }
  });

  const wb = XLSX.utils.book_new();
  const sheetName = formatMonthLabel(monthKey).slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const filename = `${sanitize(worker.name)}_${monthKey}.xlsx`;
  XLSX.writeFile(wb, filename);
}

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_');
}
