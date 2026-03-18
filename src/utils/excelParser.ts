import type { ClassData, Student, Question } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XLSXModule = any;

export interface ParseResult {
  classes: ClassData[];
  classNames: string[];
  workbook: { SheetNames: string[]; Sheets: Record<string, unknown> };
}

export function parseExcelFile(
  file: File,
  XLSXModule: XLSXModule
): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }
        const workbook = XLSXModule.read(data, { type: 'binary' });
        const { classes, classNames } = parseWorkbook(workbook, XLSXModule);
        resolve({ classes, classNames, workbook });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}

function parseWorkbook(
  workbook: { SheetNames: string[]; Sheets: Record<string, unknown> },
  XLSXModule: XLSXModule
): { classes: ClassData[]; classNames: string[] } {
  const classes: ClassData[] = [];
  const classNames: string[] = [];

  const sheetNames = workbook.SheetNames;

  // Find class_* and questions_* pairs
  const classSheets = sheetNames.filter((n) => /^class_[A-Za-z0-9_]+$/i.test(n));
  const questionSheets = sheetNames.filter((n) =>
    /^questions_[A-Za-z0-9_]+$/i.test(n)
  );

  for (const classSheetName of classSheets) {
    const suffix = classSheetName.replace(/^class_/i, '');
    const questionsSheetName = questionSheets.find(
      (q) => q.toLowerCase() === `questions_${suffix}`.toLowerCase()
    );

    const students = parseStudentSheet(
      workbook.Sheets[classSheetName],
      XLSXModule
    );
    const questions = questionsSheetName
      ? parseQuestionSheet(
          workbook.Sheets[questionsSheetName],
          XLSXModule
        )
      : [];

    classes.push({
      name: classSheetName,
      students,
      questions,
    });
    classNames.push(classSheetName);
  }

  return { classes, classNames };
}

function parseStudentSheet(
  sheet: unknown,
  XLSXModule: XLSXModule
): Student[] {
  if (!sheet) return [];
  const data = XLSXModule.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: '',
  });
  if (data.length < 2) return [];

  const headers = (data[0] as string[]).map((h) =>
    String(h || '').toLowerCase().trim()
  );
  const nameIdx = headers.findIndex(
    (h) => h.includes('student') || h.includes('name')
  );
  const groupIdx = headers.findIndex((h) => h.includes('group'));
  const gradeIdx = headers.findIndex((h) => h.includes('grade'));
  const askedIdx = headers.findIndex(
    (h) => h.includes('questions') && h.includes('asked')
  );
  const correctIdx = headers.findIndex(
    (h) => h.includes('questions') && h.includes('correct')
  );

  const students: Student[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i] as string[];
    const student_name =
      nameIdx >= 0 ? String(row[nameIdx] ?? '').trim() : String(row[0] ?? '');
    const group =
      groupIdx >= 0 ? String(row[groupIdx] ?? '').trim() : String(row[1] ?? '');
    let grade: number | null = null;
    if (gradeIdx >= 0) {
      const val = row[gradeIdx];
      if (val !== '' && val !== undefined && val !== null) {
        grade = Number(val);
        if (Number.isNaN(grade)) grade = null;
      }
    }
    let questions_asked: number | undefined;
    let questions_correct: number | undefined;
    if (askedIdx >= 0) {
      const v = Number(row[askedIdx]);
      if (!Number.isNaN(v)) questions_asked = v;
    }
    if (correctIdx >= 0) {
      const v = Number(row[correctIdx]);
      if (!Number.isNaN(v)) questions_correct = v;
    }
    if (student_name) {
      students.push({
        id: `s-${i}-${student_name}`,
        student_name,
        group,
        grade: grade ?? 0,
        questions_asked,
        questions_correct,
      });
    }
  }
  return students;
}

function parseQuestionSheet(
  sheet: unknown,
  XLSXModule: XLSXModule
): Question[] {
  if (!sheet) return [];
  const data = XLSXModule.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: '',
  });
  if (data.length < 2) return [];

  const headers = (data[0] as string[]).map((h) =>
    String(h || '').toLowerCase().trim()
  );
  const descIdx = headers.findIndex(
    (h) => h.includes('question') || h.includes('description')
  );
  const diffIdx = headers.findIndex((h) => h.includes('difficulty'));
  const weekIdx = headers.findIndex(
    (h) => h.includes('week') || h.includes('semaine')
  );

  const questions: Question[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i] as string[];
    const question_description =
      descIdx >= 0 ? String(row[descIdx] ?? '').trim() : String(row[0] ?? '');
    const difficulty =
      diffIdx >= 0 ? String(row[diffIdx] ?? '').trim() : String(row[1] ?? '');
    let week: number | undefined;
    if (weekIdx >= 0) {
      const val = row[weekIdx];
      if (val !== '' && val !== undefined && val !== null) {
        const n = Number(val);
        if (!Number.isNaN(n)) week = n;
      }
    }
    if (question_description) {
      questions.push({
        id: `q-${i}-${question_description.slice(0, 20)}`,
        question_description,
        difficulty,
        week,
      });
    }
  }
  return questions;
}
