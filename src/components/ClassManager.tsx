import { useState, useCallback, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { parseExcelFile } from '../utils/excelParser';
import { exportToExcel } from '../utils/excelExport';
import type { ClassData, Student, Question } from '../types';
import './ClassManager.css';

// Embedded at build time — works when opening HTML via file:// (no fetch)
import exampleArrayBuffer from '../../public/example-classes.xlsx?arraybuffer';

interface StudentWithQuestions extends Student {
  assignedQuestions: Question[];
  questionResults: boolean[];
}

const STEPS = [
  { id: 1, label: 'Classe' },
  { id: 2, label: 'Élèves' },
  { id: 3, label: 'Générer' },
  { id: 4, label: 'Questions' },
  { id: 5, label: 'Télécharger' },
];

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = shuffle(arr);
  return shuffled.slice(0, Math.min(n, arr.length));
}

/** Picks n questions, prioritizing week 1 (week === 1) over others. */
function pickRandomWithWeekPriority(questions: Question[], n: number): Question[] {
  const week1 = questions.filter((q) => q.week === 1);
  const others = questions.filter((q) => q.week !== 1);
  const shuffledWeek1 = shuffle(week1);
  const shuffledOthers = shuffle(others);
  const fromWeek1 = shuffledWeek1.slice(0, Math.min(n, shuffledWeek1.length));
  const remaining = n - fromWeek1.length;
  const fromOthers =
    remaining > 0
      ? shuffledOthers.slice(0, Math.min(remaining, shuffledOthers.length))
      : [];
  return [...fromWeek1, ...fromOthers];
}

function Spinner() {
  return (
    <svg
      className="spinner"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function Toast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div role="alert" className="toast">
      <svg
        className="toast-icon"
        width="20"
        height="20"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="toast-dismiss"
        aria-label="Fermer"
      >
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}

export default function ClassManager() {
  const [workbook, setWorkbook] = useState<{
    SheetNames: string[];
    Sheets: Record<string, unknown>;
  } | null>(null);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [classNames, setClassNames] = useState<string[]>([]);
  const [selectedClassIndex, setSelectedClassIndex] = useState(0);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
    new Set()
  );
  const [selectionMode, setSelectionMode] = useState<'group' | 'full' | 'multi'>(
    'full'
  );
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [questionsPerStudent, setQuestionsPerStudent] = useState(3);
  const [studentAssignments, setStudentAssignments] = useState<
    StudentWithQuestions[]
  >([]);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(
    new Set()
  );
  const [studentSearch, setStudentSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const assignmentsRef = useRef<HTMLDivElement>(null);

  const currentClass = classes[selectedClassIndex];
  const groups = currentClass
    ? [...new Set(currentClass.students.map((s) => s.group).filter(Boolean))]
    : [];

  const currentStep = useMemo(() => {
    if (studentAssignments.length > 0) return 4;
    if (currentClass && selectionMode !== 'multi') return 3;
    if (currentClass) return 2;
    return 1;
  }, [currentClass, selectionMode, studentAssignments.length]);

  const filteredStudents = useMemo(() => {
    if (!currentClass) return [];
    if (!studentSearch.trim()) return currentClass.students;
    const q = studentSearch.toLowerCase().trim();
    return currentClass.students.filter((s) =>
      s.student_name.toLowerCase().includes(q)
    );
  }, [currentClass, studentSearch]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setError(null);
      setLoading(true);
      try {
        const result = await parseExcelFile(file, XLSX);
        setWorkbook(result.workbook);
        setClasses(result.classes);
        setClassNames(result.classNames);
        setSelectedClassIndex(0);
        setSelectedStudents(new Set());
        setStudentAssignments([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse file');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleLoadExample = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const file = new File([exampleArrayBuffer], 'example-classes.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const result = await parseExcelFile(file, XLSX);
      setWorkbook(result.workbook);
      setClasses(result.classes);
      setClassNames(result.classNames);
      setSelectedClassIndex(0);
      setSelectedStudents(new Set());
      setStudentAssignments([]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load example. Run: npm run generate-example'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const applyStudentSelection = useCallback(() => {
    if (!currentClass) return;
    let ids: Set<string>;
    if (selectionMode === 'full') {
      ids = new Set(currentClass.students.map((s) => s.id));
    } else if (selectionMode === 'group' && selectedGroup) {
      ids = new Set(
        currentClass.students
          .filter((s) => s.group === selectedGroup)
          .map((s) => s.id)
      );
    } else {
      ids = new Set(selectedStudents);
    }
    setSelectedStudents(ids);
  }, [
    currentClass,
    selectionMode,
    selectedGroup,
    selectedStudents,
  ]);

  const handleGenerateQuestions = useCallback(() => {
    if (!currentClass) return;
    applyStudentSelection();
    const ids = selectionMode === 'full'
      ? new Set(currentClass.students.map((s) => s.id))
      : selectionMode === 'group' && selectedGroup
        ? new Set(
            currentClass.students
              .filter((s) => s.group === selectedGroup)
              .map((s) => s.id)
          )
        : selectedStudents;

    const studentsToAssign = currentClass.students.filter((s) => ids.has(s.id));
    const questions = currentClass.questions;

    if (questions.length === 0) {
      setError('No questions available for this class.');
      return;
    }

    const assignments: StudentWithQuestions[] = studentsToAssign.map(
      (student) => {
        const qs = pickRandomWithWeekPriority(questions, questionsPerStudent);
        return {
          ...student,
          assignedQuestions: qs,
          questionResults: qs.map(() => false),
          questions_asked: qs.length,
          questions_correct: 0,
          grade: 0,
        };
      }
    );
    setStudentAssignments(assignments);
    setExpandedStudents(new Set(assignments.map((s) => s.id)));
    setClasses((prev) =>
      prev.map((cls) => {
        if (cls.name !== currentClass.name) return cls;
        const assignedIds = new Set(studentsToAssign.map((s) => s.id));
        return {
          ...cls,
          students: cls.students.map((s) =>
            assignedIds.has(s.id)
              ? {
                  ...s,
                  questions_asked: questionsPerStudent,
                  questions_correct: 0,
                  grade: 0,
                }
              : s
          ),
        };
      })
    );
    setError(null);
    assignmentsRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [
    currentClass,
    selectionMode,
    selectedGroup,
    selectedStudents,
    questionsPerStudent,
    applyStudentSelection,
  ]);

  const handleQuestionCorrectChange = useCallback(
    (studentId: string, questionIndex: number) => {
      const student = studentAssignments.find((s) => s.id === studentId);
      if (!student) return;
      const next = [...student.questionResults];
      next[questionIndex] = !next[questionIndex];
      const correct = next.filter(Boolean).length;
      const total = next.length;
      const grade = total > 0 ? (correct / total) * 20 : 0;

      setStudentAssignments((prev) =>
        prev.map((s) =>
          s.id !== studentId
            ? s
            : {
                ...s,
                questionResults: next,
                questions_asked: total,
                questions_correct: correct,
                grade,
              }
        )
      );
      setClasses((prev) =>
        prev.map((cls) => {
          if (cls.name !== currentClass?.name) return cls;
          return {
            ...cls,
            students: cls.students.map((s) =>
              s.id === studentId
                ? {
                    ...s,
                    questions_asked: total,
                    questions_correct: correct,
                    grade,
                  }
                : s
            ),
          };
        })
      );
    },
    [currentClass?.name, studentAssignments]
  );

  const handleDownload = useCallback(() => {
    if (!workbook || classes.length === 0) return;
    const blob = exportToExcel(workbook, classes, XLSX);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `classes-updated-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    setToast('Fichier téléchargé avec succès !');
    setTimeout(() => setToast(null), 4000);
  }, [workbook, classes]);

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllStudents = () => {
    if (!currentClass) return;
    setSelectedStudents(new Set(currentClass.students.map((s) => s.id)));
  };

  const deselectAllStudents = () => {
    setSelectedStudents(new Set());
  };

  const toggleExpanded = (id: string) => {
    setExpandedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (classes.length === 0 && !loading) {
    return (
      <div className="class-manager">
        <header className="app-header">
          <h1>Mon Maître</h1>
          <p className="subtitle">
            Gestion des interrogations mathématiques
          </p>
        </header>

        <section className="card upload-section">
          <h2>Charger votre fichier Excel</h2>
          <p className="hint">
            Votre fichier doit contenir des feuilles{' '}
            <code>class_A</code>, <code>class_B</code>, etc. (élèves) et{' '}
            <code>questions_A</code>, <code>questions_B</code>, etc. (questions).
          </p>
          <div className="upload-actions">
            <label className="btn btn-primary">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={loading}
              />
              {loading ? 'Chargement...' : 'Choisir un fichier Excel'}
            </label>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleLoadExample}
              disabled={loading}
            >
              Charger l'exemple
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </section>
      </div>
    );
  }

  return (
    <div className="class-manager">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <Spinner />
            <span className="loading-text">Chargement...</span>
          </div>
        </div>
      )}

      {toast && (
        <Toast message={toast} onDismiss={() => setToast(null)} />
      )}

      <header className="app-header">
        <h1>Mon Maître</h1>
        <p className="subtitle">
          Gestion des interrogations mathématiques
        </p>
      </header>

      <div className="main-flow">
        <nav className="stepper" aria-label="Progression">
          {STEPS.map((step, i) => {
            const isActive = step.id === currentStep;
            const isPast = step.id < currentStep;
            return (
              <div key={step.id} className="stepper-item">
                <div
                  className={`stepper-dot ${
                    isActive
                      ? 'stepper-dot--active'
                      : isPast
                        ? 'stepper-dot--past'
                        : 'stepper-dot--pending'
                  }`}
                >
                  {step.id}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`stepper-connector ${
                      isPast ? 'stepper-connector--past' : 'stepper-connector--pending'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </nav>

        <div className="reload-row">
          <label className="btn btn-secondary btn-small">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={loading}
            />
            Changer de fichier
          </label>
        </div>

        <section className="card">
          <h2>1. Sélectionner la classe</h2>
          <select
            value={selectedClassIndex}
            onChange={(e) => {
              setSelectedClassIndex(Number(e.target.value));
              setStudentAssignments([]);
            }}
          >
            {classNames.map((name, i) => (
              <option key={name} value={i}>
                {name} ({classes[i]?.students.length} élèves,{' '}
                {classes[i]?.questions.length} questions)
              </option>
            ))}
          </select>
        </section>

        {currentClass && (
          <>
            <section className="card">
              <h2>2. Sélectionner les élèves</h2>
              <div className="selection-mode">
                {(['full', 'group', 'multi'] as const).map((mode) => (
                  <label key={mode}>
                    <input
                      type="radio"
                      name="mode"
                      checked={selectionMode === mode}
                      onChange={() => setSelectionMode(mode)}
                    />
                    <span>
                      {mode === 'full' && 'Toute la classe'}
                      {mode === 'group' && 'Par groupe'}
                      {mode === 'multi' && 'Sélection manuelle'}
                    </span>
                  </label>
                ))}
              </div>

              {selectionMode === 'group' && (
                <div className="group-select">
                  <label>Groupe :</label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                  >
                    <option value="">-- Choisir --</option>
                    {groups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectionMode === 'multi' && (
                <div className="multi-select">
                  <input
                    type="search"
                    placeholder="Rechercher un élève..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                  <div className="multi-actions">
                    <button
                      type="button"
                      onClick={selectAllStudents}
                    >
                      Tout sélectionner
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllStudents}
                    >
                      Tout désélectionner
                    </button>
                  </div>
                  <div className="student-checkboxes">
                    {filteredStudents.map((s) => (
                      <label key={s.id} className="student-check">
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(s.id)}
                          onChange={() => toggleStudent(s.id)}
                        />
                        <span>
                          {s.student_name}
                          {s.group && (
                            <span className="group-badge">G{s.group}</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                  {filteredStudents.length === 0 && studentSearch && (
                    <p className="empty-search">
                      Aucun élève trouvé pour « {studentSearch} »
                    </p>
                  )}
                </div>
              )}
            </section>

            <section className="card">
              <h2>3. Générer les questions</h2>
              <div className="generate-row">
                <label>
                  Questions par élève :
                  <input
                    type="number"
                    min={1}
                    max={currentClass.questions.length}
                    value={questionsPerStudent}
                    onChange={(e) =>
                      setQuestionsPerStudent(
                        Math.max(
                          1,
                          Math.min(
                            currentClass.questions.length,
                            Number(e.target.value) || 1
                          )
                        )
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleGenerateQuestions}
                >
                  Générer les questions
                </button>
              </div>
              {error && <p className="error">{error}</p>}
            </section>

            {studentAssignments.length > 0 && (
              <section ref={assignmentsRef} className="card">
                <h2>4. Questions assignées — cochez correct</h2>
                <div className="assignments-list">
                  {studentAssignments.map((student) => {
                    const correct = student.questionResults.filter(Boolean)
                      .length;
                    const total = student.questionResults.length;
                    const grade = total > 0 ? (correct / total) * 20 : 0;
                    const isExpanded = expandedStudents.has(student.id);
                    const progress = total > 0 ? (correct / total) * 100 : 0;

                    return (
                      <div key={student.id} className="assignment-card">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(student.id)}
                          className="assignment-toggle"
                        >
                          <div className="assignment-toggle-left">
                            <svg
                              className={`assignment-chevron ${isExpanded ? 'expanded' : ''}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <h3>
                              {student.student_name}
                              {student.group && (
                                <span className="group-badge">
                                  G{student.group}
                                </span>
                              )}
                            </h3>
                          </div>
                          <div className="student-stats">
                            <span>{total} posées</span>
                            <span>{correct} correctes</span>
                            <span className="grade-result">
                              {grade.toFixed(1)}/20
                            </span>
                            <div className="progress-bar">
                              <div
                                className="progress-fill"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </button>
                        {isExpanded && (
                          <ol className="question-list assignment-body">
                            {student.assignedQuestions.map((q, idx) => (
                              <li key={q.id}>
                                <label className="question-check">
                                  <input
                                    type="checkbox"
                                    checked={student.questionResults[idx]}
                                    onChange={() =>
                                      handleQuestionCorrectChange(
                                        student.id,
                                        idx
                                      )
                                    }
                                  />
                                  <span className="q-desc">
                                    {q.question_description}
                                  </span>
                                </label>
                                {q.week != null && (
                                  <span className="q-week">
                                    Semaine {q.week}
                                  </span>
                                )}
                                {q.difficulty && (
                                  <span
                                    className={`diff diff-${q.difficulty.toLowerCase()}`}
                                  >
                                    {q.difficulty}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="card download-section">
              <h2>5. Télécharger le fichier mis à jour</h2>
              <button
                type="button"
                className="btn btn-primary btn-large"
                onClick={handleDownload}
              >
                Télécharger l'Excel mis à jour
              </button>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
