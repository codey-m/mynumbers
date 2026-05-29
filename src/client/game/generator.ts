// ============================================================================
// Puzzle generation and checking — client-side (no server needed)
// ============================================================================

type Fraction = [number, number];
type Expr = number | [Expr, string, Expr];

interface DifficultyConfig {
  ops: string[];
  min_leaf: number;
  max_leaf: number;
  target_min: number;
  target_max: number;
  min_parens: number;
  max_parens: number;
  max_muls: number | null;
  max_divs: number | null;
  min_divs?: number;
}

export interface PuzzleOut {
  target: number;
  numbers: number[];
  solution_expr: string | null;
  used_numbers: number[];
  max_operand_count: number;
  template_tokens: string[];
  num_placeholders: number;
}

export interface CheckResult {
  correct: boolean;
  reason: string;
  evaluated: number | null;
  evaluated_display: string | null;
  message: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const OPS = ['+', '-', '*', '/'];
const MAX_LEAF = 19;
const MIN_LEAF = 1;
const ATTEMPTS = 2000;

const OP_PRECEDENCE: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };

const DIFFICULTY_CONFIGS: Record<number, DifficultyConfig> = {
  1: { ops: ['+'], min_leaf: 1, max_leaf: 10, target_min: 10, target_max: 25, min_parens: 0, max_parens: 0, max_muls: 0, max_divs: 0 },
  2: { ops: ['+', '-'], min_leaf: 1, max_leaf: 12, target_min: 15, target_max: 30, min_parens: 0, max_parens: 0, max_muls: 0, max_divs: 0 },
  3: { ops: ['+', '-'], min_leaf: 1, max_leaf: 15, target_min: 20, target_max: 35, min_parens: 1, max_parens: 2, max_muls: 0, max_divs: 0 },
  4: { ops: ['+', '-', '*'], min_leaf: 1, max_leaf: 9, target_min: 25, target_max: 45, min_parens: 0, max_parens: 0, max_muls: 1, max_divs: 0 },
  5: { ops: ['+', '-', '*'], min_leaf: 1, max_leaf: 10, target_min: 30, target_max: 55, min_parens: 0, max_parens: 0, max_muls: null, max_divs: 0 },
  6: { ops: ['+', '-', '*'], min_leaf: 2, max_leaf: 10, target_min: 35, target_max: 60, min_parens: 1, max_parens: 1, max_muls: 1, max_divs: 0 },
  7: { ops: ['+', '-', '*', '/'], min_leaf: 2, max_leaf: 12, target_min: 50, target_max: 75, min_parens: 0, max_parens: 1, max_muls: 1, max_divs: 1, min_divs: 1 },
  8: { ops: ['+', '-', '*'], min_leaf: 2, max_leaf: 12, target_min: 45, target_max: 70, min_parens: 1, max_parens: 2, max_muls: null, max_divs: 0 },
  9: { ops: ['+', '-', '*', '/'], min_leaf: 2, max_leaf: 14, target_min: 60, target_max: 85, min_parens: 1, max_parens: 2, max_muls: 2, max_divs: null },
  10: { ops: ['+', '-', '*', '/'], min_leaf: 3, max_leaf: 15, target_min: 70, target_max: 100, min_parens: 2, max_parens: 3, max_muls: null, max_divs: null },
  11: { ops: ['+', '-', '*', '/'], min_leaf: 3, max_leaf: 18, target_min: 85, target_max: 115, min_parens: 3, max_parens: 4, max_muls: null, max_divs: null },
  12: { ops: ['+', '-', '*', '/'], min_leaf: 4, max_leaf: 20, target_min: 100, target_max: 140, min_parens: 4, max_parens: 5, max_muls: null, max_divs: null },
};

// ============================================================================
// FRACTION ARITHMETIC
// ============================================================================

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function fracNorm(n: number, d: number): Fraction {
  if (d === 0) throw new Error('Division by zero');
  if (n === 0) return [0, 1];
  const sign = (d < 0) ? -1 : 1;
  const g = gcd(Math.abs(n), Math.abs(d));
  return [sign * n / g, sign * d / g];
}

function fracAdd([n1, d1]: Fraction, [n2, d2]: Fraction): Fraction { return fracNorm(n1 * d2 + n2 * d1, d1 * d2); }
function fracSub([n1, d1]: Fraction, [n2, d2]: Fraction): Fraction { return fracNorm(n1 * d2 - n2 * d1, d1 * d2); }
function fracMul([n1, d1]: Fraction, [n2, d2]: Fraction): Fraction { return fracNorm(n1 * n2, d1 * d2); }
function fracDiv([n1, d1]: Fraction, [n2, d2]: Fraction): Fraction {
  if (n2 === 0) throw new Error('Division by zero');
  return fracNorm(n1 * d2, d1 * n2);
}

// ============================================================================
// EXPRESSION CONSTRUCTION
// ============================================================================

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeRandomExprConstrained(numOperands: number, allowedOps: string[], minVal: number, maxVal: number): Expr {
  if (numOperands === 1) return randInt(minVal, maxVal);
  const leftCount = randInt(1, numOperands - 1);
  const rightCount = numOperands - leftCount;
  const left = makeRandomExprConstrained(leftCount, allowedOps, minVal, maxVal);
  const right = makeRandomExprConstrained(rightCount, allowedOps, minVal, maxVal);
  const op = randChoice(allowedOps);
  return [left, op, right];
}

function makeRandomExpr(numOperands: number): Expr {
  if (numOperands === 1) return randInt(MIN_LEAF, MAX_LEAF);
  const leftCount = randInt(1, numOperands - 1);
  const rightCount = numOperands - leftCount;
  const left = makeRandomExpr(leftCount);
  const right = makeRandomExpr(rightCount);
  const op = randChoice(OPS);
  return [left, op, right];
}

function evalExprFraction(expr: Expr): Fraction {
  if (typeof expr === 'number') return [expr, 1];
  const [left, op, right] = expr;
  const a = evalExprFraction(left);
  const b = evalExprFraction(right);
  switch (op) {
    case '+': return fracAdd(a, b);
    case '-': return fracSub(a, b);
    case '*': return fracMul(a, b);
    case '/': return fracDiv(a, b);
    default: throw new Error('Unknown operator');
  }
}

function collectLeaves(expr: Expr): number[] {
  if (typeof expr === 'number') return [expr];
  const [left, , right] = expr;
  return [...collectLeaves(left), ...collectLeaves(right)];
}

function countOp(expr: Expr, op: string): number {
  if (typeof expr === 'number') return 0;
  const [left, nodeOp, right] = expr;
  return (nodeOp === op ? 1 : 0) + countOp(left, op) + countOp(right, op);
}

// ============================================================================
// MINIMAL-PARENTHESES STRINGIFIERS
// ============================================================================

function exprToMinimalValueString(expr: Expr, parentOp: string | null = null, isRight = false): string {
  if (typeof expr === 'number') return String(expr);
  const [left, op, right] = expr;
  const leftS = exprToMinimalValueString(left, op, false);
  const rightS = exprToMinimalValueString(right, op, true);
  let s = `${leftS}${op}${rightS}`;

  let needParen = false;
  if (parentOp !== null) {
    if (OP_PRECEDENCE[op] < OP_PRECEDENCE[parentOp]) needParen = true;
    if (isRight && (op === '-' || op === '/') && OP_PRECEDENCE[op] === OP_PRECEDENCE[parentOp]) needParen = true;
  }
  if (needParen) s = `(${s})`;
  return s;
}

function exprToMinimalPlaceholderString(expr: Expr, startIndex = 0, parentOp: string | null = null, isRight = false): [string, number] {
  if (typeof expr === 'number') return [`{${startIndex}}`, startIndex + 1];
  const [left, op, right] = expr;
  const [leftS, nextIdx1] = exprToMinimalPlaceholderString(left, startIndex, op, false);
  const [rightS, nextIdx2] = exprToMinimalPlaceholderString(right, nextIdx1, op, true);
  let s = `${leftS}${op}${rightS}`;

  let needParen = false;
  if (parentOp !== null) {
    if (OP_PRECEDENCE[op] < OP_PRECEDENCE[parentOp]) needParen = true;
    if (isRight && (op === '-' || op === '/') && OP_PRECEDENCE[op] === OP_PRECEDENCE[parentOp]) needParen = true;
  }
  if (needParen) s = `(${s})`;
  return [s, nextIdx2];
}

function minimalTokensFromPlaceholderString(s: string): string[] {
  return s.match(/\{[0-9]+\}|\(|\)|[+\-*/]/g) || [];
}

// ============================================================================
// TEMPLATE VERIFICATION
// ============================================================================

function getPermutations<T>(arr: T[], size: number): T[][] {
  const results: T[][] = [];
  if (size > arr.length) return results;

  function helper(chosen: T[], remaining: T[]): void {
    if (chosen.length === size) { results.push([...chosen]); return; }
    for (let i = 0; i < remaining.length; i++) {
      chosen.push(remaining[i]);
      helper(chosen, [...remaining.slice(0, i), ...remaining.slice(i + 1)]);
      chosen.pop();
    }
  }
  helper([], arr);
  return results;
}

function verifyTemplateSolvable(templateTokens: string[], numbers: number[], target: number): boolean {
  const numSlots = templateTokens.filter(t => t.startsWith('{')).length;
  const perms = getPermutations(numbers, numSlots);

  for (const perm of perms) {
    let exprStr = '';
    let slotIdx = 0;
    for (const token of templateTokens) {
      if (token.startsWith('{')) {
        exprStr += String(perm[slotIdx]);
        slotIdx++;
      } else {
        exprStr += token;
      }
    }
    try {
      const result = safeEvalToFraction(exprStr);
      if (result[0] === target && result[1] === 1) return true;
    } catch {
      continue;
    }
  }
  return false;
}

// ============================================================================
// SAFE EXPRESSION EVALUATOR
// ============================================================================

function safeEvalToFraction(exprStr: string): Fraction {
  if (!/^[0-9+\-*/() ]+$/.test(exprStr)) {
    throw new Error('Expression contains invalid characters');
  }

  const tokens = exprStr.match(/\d+|[+\-*/()]/g);
  if (!tokens) throw new Error('Empty expression');

  let pos = 0;

  function peek(): string | undefined { return tokens![pos]; }
  function consume(): string { return tokens![pos++]; }

  function parseExpr(): Fraction {
    let left = parseTerm();
    while (pos < tokens!.length && (peek() === '+' || peek() === '-')) {
      const op = consume();
      const right = parseTerm();
      if (op === '+') left = fracAdd(left, right);
      else left = fracSub(left, right);
    }
    return left;
  }

  function parseTerm(): Fraction {
    let left = parseFactor();
    while (pos < tokens!.length && (peek() === '*' || peek() === '/')) {
      const op = consume();
      const right = parseFactor();
      if (op === '*') left = fracMul(left, right);
      else left = fracDiv(left, right);
    }
    return left;
  }

  function parseFactor(): Fraction {
    if (peek() === '(') {
      consume();
      const val = parseExpr();
      if (peek() !== ')') throw new Error('Mismatched parentheses');
      consume();
      return val;
    }
    if (peek() === '-') {
      consume();
      const val = parseFactor();
      return fracMul([-1, 1], val);
    }
    if (peek() === '+') {
      consume();
      return parseFactor();
    }
    const numStr = consume();
    if (!/^\d+$/.test(numStr)) throw new Error(`Unexpected token: ${numStr}`);
    return [parseInt(numStr, 10), 1];
  }

  const result = parseExpr();
  if (pos < tokens.length) throw new Error('Unexpected trailing tokens');
  return result;
}

// ============================================================================
// PUZZLE GENERATION: PRACTICE MODE
// ============================================================================

export function puzzleNew({
  numOperands = 5,
  decoys = 1,
  targetMin = 10,
  targetMax = 150,
  requireParensProb = 0.6,
} = {}): PuzzleOut {
  if (numOperands < 2) throw new Error('num_operands must be >= 2');

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const expr = makeRandomExpr(numOperands);

    let result: Fraction;
    try { result = evalExprFraction(expr); } catch { continue; }
    if (result[1] !== 1) continue;

    const val = result[0];
    if (val < targetMin || val > targetMax) continue;

    const used = collectLeaves(expr);
    if (used.length !== numOperands || new Set(used).size !== numOperands) continue;

    const numbers = [...used];
    const decoyPool: number[] = [];
    for (let n = MIN_LEAF; n <= MAX_LEAF; n++) {
      if (!numbers.includes(n)) decoyPool.push(n);
    }
    if (decoyPool.length < decoys) continue;

    const shuffledDecoys = shuffle(decoyPool);
    numbers.push(...shuffledDecoys.slice(0, decoys));
    const shuffledNumbers = shuffle(numbers);

    const [placeholderStr, placeholderCount] = exprToMinimalPlaceholderString(expr, 0);
    const tokens = minimalTokensFromPlaceholderString(placeholderStr);
    if (placeholderCount !== numOperands) continue;

    if (Math.random() < requireParensProb) {
      if (!tokens.includes('(')) continue;
    }

    if (!verifyTemplateSolvable(tokens, shuffledNumbers, val)) continue;

    return {
      target: val,
      numbers: shuffledNumbers,
      solution_expr: exprToMinimalValueString(expr),
      used_numbers: used,
      max_operand_count: numOperands,
      template_tokens: tokens,
      num_placeholders: placeholderCount,
    };
  }

  throw new Error('Failed to generate puzzle; try adjusting parameters');
}

// ============================================================================
// PUZZLE GENERATION: RUSH MODE
// ============================================================================

export function puzzleRush({ difficulty = 1, decoys = 2 } = {}): PuzzleOut {
  if (difficulty < 1 || difficulty > 12) throw new Error('difficulty must be 1-12');

  const config = DIFFICULTY_CONFIGS[difficulty];

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const expr = makeRandomExprConstrained(5, config.ops, config.min_leaf, config.max_leaf);

    let result: Fraction;
    try { result = evalExprFraction(expr); } catch { continue; }
    if (result[1] !== 1) continue;

    const val = result[0];
    if (val < config.target_min || val > config.target_max) continue;

    const used = collectLeaves(expr);
    if (used.length !== 5 || new Set(used).size !== 5) continue;

    const numbers = [...used];
    const decoyPool: number[] = [];
    for (let n = config.min_leaf; n <= config.max_leaf; n++) {
      if (!numbers.includes(n)) decoyPool.push(n);
    }
    if (decoyPool.length < decoys) continue;

    const shuffledDecoys = shuffle(decoyPool);
    numbers.push(...shuffledDecoys.slice(0, decoys));
    const shuffledNumbers = shuffle(numbers);

    const [placeholderStr, placeholderCount] = exprToMinimalPlaceholderString(expr, 0);
    const tokens = minimalTokensFromPlaceholderString(placeholderStr);
    if (placeholderCount !== 5) continue;

    const maxMuls = config.max_muls;
    const maxDivs = config.max_divs;
    const minDivs = config.min_divs || 0;
    if (maxMuls !== null && countOp(expr, '*') > maxMuls) continue;
    if (maxDivs !== null && countOp(expr, '/') > maxDivs) continue;
    if (countOp(expr, '/') < minDivs) continue;

    const parenCount = tokens.filter(t => t === '(').length;
    if (parenCount < config.min_parens || parenCount > config.max_parens) continue;

    if (!verifyTemplateSolvable(tokens, shuffledNumbers, val)) continue;

    return {
      target: val,
      numbers: shuffledNumbers,
      solution_expr: null,
      used_numbers: used,
      max_operand_count: 5,
      template_tokens: tokens,
      num_placeholders: placeholderCount,
    };
  }

  throw new Error('Failed to generate puzzle');
}

// ============================================================================
// CHECK EXPRESSION
// ============================================================================

export function puzzleCheck({ numbers, expression, target }: { numbers: number[]; expression: string; target?: number }): CheckResult {
  if (!numbers || !expression) throw new Error('Missing numbers or expression');

  const usedNumbers = (expression.match(/\d+/g) || []).map(Number);

  const bankCounts: Record<number, number> = {};
  for (const n of numbers) bankCounts[n] = (bankCounts[n] || 0) + 1;

  const tempCounts = { ...bankCounts };
  for (const u of usedNumbers) {
    if ((tempCounts[u] || 0) <= 0) {
      return {
        correct: false,
        reason: 'invalid_expression',
        evaluated: null,
        evaluated_display: null,
        message: `Number ${u} not available or used too many times`,
      };
    }
    tempCounts[u]--;
  }

  let valFrac: Fraction;
  try {
    valFrac = safeEvalToFraction(expression);
  } catch (e: any) {
    const msg = e.message?.includes('Division by zero') ? 'Division by zero' : `Invalid expression: ${e.message}`;
    return {
      correct: false,
      reason: 'invalid_expression',
      evaluated: null,
      evaluated_display: null,
      message: msg,
    };
  }

  const evaluated = valFrac[1] === 1 ? valFrac[0] : valFrac[0] / valFrac[1];
  const evaluatedDisplay = valFrac[1] === 1 ? String(valFrac[0]) : `${valFrac[0]}/${valFrac[1]}`;

  if (target !== undefined && target !== null) {
    const targetVal = Number(target);
    if (isNaN(targetVal)) {
      return {
        correct: false,
        reason: 'invalid_expression',
        evaluated,
        evaluated_display: evaluatedDisplay,
        message: 'Invalid target value',
      };
    }
    const correct = valFrac[0] === targetVal && valFrac[1] === 1;
    return {
      correct,
      reason: correct ? 'correct' : 'wrong_value',
      evaluated,
      evaluated_display: evaluatedDisplay,
      message: null,
    };
  }

  return {
    correct: false,
    reason: 'valid_expression',
    evaluated,
    evaluated_display: evaluatedDisplay,
    message: null,
  };
}
