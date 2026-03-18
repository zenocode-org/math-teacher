#!/usr/bin/env node
/**
 * Generates an example Excel file for the math professor app.
 * Run: node scripts/generate-example-excel.mjs
 */

import XLSX from 'xlsx';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const workbook = XLSX.utils.book_new();

// Class A - Students
const classAStudents = [
  ['student_name', 'group', 'questions_asked', 'questions_correct', 'grade'],
  ['Alice Martin', '1', 0, 0, 0],
  ['Bob Dupont', '1', 0, 0, 0],
  ['Claire Bernard', '2', 0, 0, 0],
  ['David Leroy', '2', 0, 0, 0],
  ['Emma Petit', '3', 0, 0, 0],
  ['François Moreau', '3', 0, 0, 0],
];
const wsClassA = XLSX.utils.aoa_to_sheet(classAStudents);
XLSX.utils.book_append_sheet(workbook, wsClassA, 'class_A');

// Class B - Students
const classBStudents = [
  ['student_name', 'group', 'questions_asked', 'questions_correct', 'grade'],
  ['Gabriel Simon', '1', 0, 0, 0],
  ['Hélène Laurent', '1', 0, 0, 0],
  ['Ivan Michel', '2', 0, 0, 0],
  ['Julie Garcia', '2', 0, 0, 0],
];
const wsClassB = XLSX.utils.aoa_to_sheet(classBStudents);
XLSX.utils.book_append_sheet(workbook, wsClassB, 'class_B');

// Questions A - Calculus
const questionsA = [
  ['question_description', 'difficulty', 'week'],
  ['Calculate the derivative of f(x) = x³ + 2x² - 5x + 1', 'easy', 1],
  ['Find the limit: lim(x→0) sin(x)/x', 'medium', 1],
  ['Solve the integral ∫ x·e^x dx', 'hard', 2],
  ['Determine the Taylor series of e^x at x=0', 'hard', 3],
  ['Find the critical points of f(x) = x⁴ - 4x³ + 2', 'medium', 2],
  ['Calculate ∫₀^π sin²(x) dx', 'medium', 2],
  ['Prove that d/dx(ln|x|) = 1/x', 'easy', 1],
  ['Solve the differential equation dy/dx = 2y', 'medium', 3],
  ['Find the area under y = x² from 0 to 2', 'easy', 1],
  ['Determine convergence of Σ 1/n²', 'hard', 3],
];
const wsQuestionsA = XLSX.utils.aoa_to_sheet(questionsA);
XLSX.utils.book_append_sheet(workbook, wsQuestionsA, 'questions_A');

// Questions B - Linear Algebra
const questionsB = [
  ['question_description', 'difficulty', 'week'],
  ['Compute the determinant of a 2×2 matrix', 'easy', 1],
  ['Find the eigenvalues of [[2,1],[1,2]]', 'medium', 2],
  ['Solve the system: 2x + y = 5, x - y = 1', 'easy', 1],
  ['Determine if vectors (1,2,3) and (2,4,6) are linearly independent', 'medium', 2],
  ['Find the inverse of a 3×3 matrix', 'hard', 3],
  ['Compute the rank of a matrix', 'medium', 2],
  ['Apply Gram-Schmidt orthogonalization', 'hard', 3],
  ['Find the null space of a matrix', 'medium', 2],
  ['Calculate the dot product and cross product', 'easy', 1],
  ['Prove that (AB)ᵀ = BᵀAᵀ', 'hard', 3],
];
const wsQuestionsB = XLSX.utils.aoa_to_sheet(questionsB);
XLSX.utils.book_append_sheet(workbook, wsQuestionsB, 'questions_B');

// Write to public folder so it can be downloaded
const outputDir = join(__dirname, '..', 'public');
mkdirSync(outputDir, { recursive: true });
const outputPath = join(outputDir, 'example-classes.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log('Example Excel file generated at:', outputPath);
