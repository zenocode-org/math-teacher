import type { ClassData } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XLSXModule = any;

export function exportToExcel(
  workbook: { SheetNames: string[]; Sheets: Record<string, unknown> },
  classes: ClassData[],
  XLSXModule: XLSXModule
): Blob {
  // Update class sheets with new grades (preserves question sheets and order)
  for (const cls of classes) {
    const rows: (string | number)[][] = [
      ['student_name', 'group', 'questions_asked', 'questions_correct', 'grade'],
      ...cls.students.map((s) => [
        s.student_name,
        s.group,
        s.questions_asked ?? 0,
        s.questions_correct ?? 0,
        s.grade ?? 0,
      ] as (string | number)[]),
    ];
    const sheet = XLSXModule.utils.aoa_to_sheet(rows);
    workbook.Sheets[cls.name] = sheet;
  }

  const wbout = XLSXModule.write(workbook, {
    bookType: 'xlsx',
    type: 'binary',
  });

  const buf = new ArrayBuffer(wbout.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < wbout.length; i++) {
    view[i] = wbout.charCodeAt(i) & 0xff;
  }
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
