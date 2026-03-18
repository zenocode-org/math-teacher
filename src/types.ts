export interface Question {
  id: string;
  question_description: string;
  difficulty: string;
  week?: number;
}

export interface Student {
  id: string;
  student_name: string;
  group: string;
  grade: number | null;
  questions_asked?: number;
  questions_correct?: number;
}

export interface ClassData {
  name: string;
  students: Student[];
  questions: Question[];
}

export interface ParsedExcel {
  classes: ClassData[];
  classNames: string[];
}
