/**
 * Math Answer Normalizer & Semantic Equivalence Checker
 * Handles Vietnamese math notation, LaTeX variants, fractions, spaces, and Unicode symbols.
 */

export function normalizeMathString(input: string): string {
  if (!input) return '';

  let str = input.trim().toLowerCase();

  // Remove LaTeX wrappers like $...$ or $$...$$
  str = str.replace(/\$+/g, '');

  // Replace common Unicode math symbols
  str = str
    .replace(/[−–—]/g, '-')
    .replace(/[×*•]/g, '*')
    .replace(/[÷:]/g, '/')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/√/g, 'sqrt')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/≠/g, '!=')
    .replace(/π/g, 'pi')
    .replace(/,/g, '.'); // Convert decimal comma to dot (e.g., 0,5 -> 0.5)

  // Normalize LaTeX expressions
  str = str.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
  str = str.replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)');
  str = str.replace(/\\sqrt([0-9a-zA-Z]+)/g, 'sqrt($1)');
  str = str.replace(/\\left|\\right/g, '');
  str = str.replace(/\\cdot/g, '*');
  str = str.replace(/\\pm/g, '+-');
  str = str.replace(/\\le|\\leq/g, '<=');
  str = str.replace(/\\ge|\\geq/g, '>=');
  str = str.replace(/\\neq/g, '!=');

  // Strip Vietnamese filler words when answering numbers/equations
  str = str
    .replace(/\b(x\s*bằng|x\s*là|kết\s*quả\s*là|đáp\s*án\s*là|nghiệm\s*là|nghiệm|bằng|là)\b/gi, '')
    .replace(/\b(giờ|phút|giây|ngày|cây|m|cm|km|kg|lít|bể)\b/gi, '');

  // Strip all whitespace for canonical math comparison
  str = str.replace(/\s+/g, '');

  return str;
}

/**
 * Checks if two math representations are equivalent
 */
export function areMathAnswersEquivalent(student: string, expected: string, variations?: string[]): boolean {
  if (!student || !expected) return false;

  const normStudent = normalizeMathString(student);
  const normExpected = normalizeMathString(expected);

  if (!normStudent) return false;

  // Exact canonical match
  if (normStudent === normExpected) return true;

  // Check acceptable variations
  if (variations && variations.length > 0) {
    for (const v of variations) {
      if (normStudent === normalizeMathString(v)) return true;
    }
  }

  // Handle commutativity of multiplication like (x-3)(x+3) vs (x+3)(x-3)
  const sortedFactorsStudent = normStudent.replace(/[()]/g, ' ').split(' ').filter(Boolean).sort().join('*');
  const sortedFactorsExpected = normExpected.replace(/[()]/g, ' ').split(' ').filter(Boolean).sort().join('*');
  if (sortedFactorsStudent.length > 2 && sortedFactorsStudent === sortedFactorsExpected) {
    return true;
  }

  // Handle commutativity of system of equations / multiple roots: e.g. x=12,y=8 vs y=8,x=12 or 12;8 vs 8;12
  const studentPairs = normStudent.split(/[,;&]/).sort().join(';');
  const expectedPairs = normExpected.split(/[,;&]/).sort().join(';');
  if (studentPairs === expectedPairs && studentPairs.length > 1) {
    return true;
  }

  // Numerical equivalence (e.g. 1/2 vs 0.5, 5/2 vs 2.5)
  try {
    const parseFraction = (s: string) => {
      const match = s.match(/^(-?\d+(\.\d+)?)\/(-?\d+(\.\d+)?)$/);
      if (match) return parseFloat(match[1]) / parseFloat(match[3]);
      const num = parseFloat(s);
      return isNaN(num) ? null : num;
    };

    const numStudent = parseFraction(normStudent);
    const numExpected = parseFraction(normExpected);
    if (numStudent !== null && numExpected !== null && Math.abs(numStudent - numExpected) < 1e-6) {
      return true;
    }
  } catch {
    // Ignore numerical parse failures
  }

  return false;
}
