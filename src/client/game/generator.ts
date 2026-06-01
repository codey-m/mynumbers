// ============================================================================
// Puzzle generation and checking — client-side (no server needed)
// ============================================================================

type Fraction = [number, number]
type Expression = number | [Expression, string, Expression]

interface DifficultyConfig {
  ops: string[]
  min_leaf: number
  max_leaf: number
  target_min: number
  target_max: number
  min_parens: number
  max_parens: number
  max_muls: number | null
  max_divs: number | null
  min_divs?: number
}

export interface PuzzleOut {
  target: number
  numbers: number[]
  solution_expr: string | null
  used_numbers: number[]
  max_operand_count: number
  template_tokens: string[]
  num_placeholders: number
}

export interface CheckResult {
  correct: boolean
  reason: string
  evaluated: number | null
  evaluated_display: string | null
  message: string | null
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ALL_OPERATORS = ['+', '-', '*', '/']
const MAX_LEAF_VALUE = 19
const MIN_LEAF_VALUE = 1
const MAX_GENERATION_ATTEMPTS = 2000

const OPERATOR_PRECEDENCE: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 }

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
}

// ============================================================================
// FRACTION ARITHMETIC
// ============================================================================

function greatestCommonDivisor(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) { [a, b] = [b, a % b] }
  return a
}

function normalizeFraction(numerator: number, denominator: number): Fraction {
  if (denominator === 0) throw new Error('Division by zero')
  if (numerator === 0) return [0, 1]
  const sign = (denominator < 0) ? -1 : 1
  const divisor = greatestCommonDivisor(Math.abs(numerator), Math.abs(denominator))
  return [sign * numerator / divisor, sign * denominator / divisor]
}

function addFractions([n1, d1]: Fraction, [n2, d2]: Fraction): Fraction { return normalizeFraction(n1 * d2 + n2 * d1, d1 * d2) }
function subtractFractions([n1, d1]: Fraction, [n2, d2]: Fraction): Fraction { return normalizeFraction(n1 * d2 - n2 * d1, d1 * d2) }
function multiplyFractions([n1, d1]: Fraction, [n2, d2]: Fraction): Fraction { return normalizeFraction(n1 * n2, d1 * d2) }
function divideFractions([n1, d1]: Fraction, [n2, d2]: Fraction): Fraction {
  if (n2 === 0) throw new Error('Division by zero')
  return normalizeFraction(n1 * d2, d1 * n2)
}

// ============================================================================
// EXPRESSION CONSTRUCTION
// ============================================================================

function randomIntInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function buildRandomExpressionConstrained(operandCount: number, allowedOps: string[], minLeafValue: number, maxLeafValue: number): Expression {
  if (operandCount === 1) return randomIntInRange(minLeafValue, maxLeafValue)
  const leftOperandCount = randomIntInRange(1, operandCount - 1)
  const rightOperandCount = operandCount - leftOperandCount
  const leftSubtree = buildRandomExpressionConstrained(leftOperandCount, allowedOps, minLeafValue, maxLeafValue)
  const rightSubtree = buildRandomExpressionConstrained(rightOperandCount, allowedOps, minLeafValue, maxLeafValue)
  const operator = pickRandom(allowedOps)
  return [leftSubtree, operator, rightSubtree]
}

function buildRandomExpression(operandCount: number): Expression {
  if (operandCount === 1) return randomIntInRange(MIN_LEAF_VALUE, MAX_LEAF_VALUE)
  const leftOperandCount = randomIntInRange(1, operandCount - 1)
  const rightOperandCount = operandCount - leftOperandCount
  const leftSubtree = buildRandomExpression(leftOperandCount)
  const rightSubtree = buildRandomExpression(rightOperandCount)
  const operator = pickRandom(ALL_OPERATORS)
  return [leftSubtree, operator, rightSubtree]
}

function evaluateExpressionAsFraction(expression: Expression): Fraction {
  if (typeof expression === 'number') return [expression, 1]
  const [leftExpr, operator, rightExpr] = expression
  const leftValue = evaluateExpressionAsFraction(leftExpr)
  const rightValue = evaluateExpressionAsFraction(rightExpr)
  switch (operator) {
    case '+': return addFractions(leftValue, rightValue)
    case '-': return subtractFractions(leftValue, rightValue)
    case '*': return multiplyFractions(leftValue, rightValue)
    case '/': return divideFractions(leftValue, rightValue)
    default: throw new Error('Unknown operator')
  }
}

function collectLeafValues(expression: Expression): number[] {
  if (typeof expression === 'number') return [expression]
  const [leftExpr, , rightExpr] = expression
  return [...collectLeafValues(leftExpr), ...collectLeafValues(rightExpr)]
}

function countOperatorOccurrences(expression: Expression, targetOperator: string): number {
  if (typeof expression === 'number') return 0
  const [leftExpr, operator, rightExpr] = expression
  return (operator === targetOperator ? 1 : 0) + countOperatorOccurrences(leftExpr, targetOperator) + countOperatorOccurrences(rightExpr, targetOperator)
}

// ============================================================================
// MINIMAL-PARENTHESES STRINGIFIERS
// ============================================================================

function expressionToDisplayString(expression: Expression, parentOperator: string | null = null, isRightChild = false): string {
  if (typeof expression === 'number') return String(expression)
  const [leftExpr, operator, rightExpr] = expression
  const leftString = expressionToDisplayString(leftExpr, operator, false)
  const rightString = expressionToDisplayString(rightExpr, operator, true)
  let result = `${leftString}${operator}${rightString}`

  let needsParentheses = false
  if (parentOperator !== null) {
    if (OPERATOR_PRECEDENCE[operator] < OPERATOR_PRECEDENCE[parentOperator]) needsParentheses = true
    if (isRightChild && (operator === '-' || operator === '/') && OPERATOR_PRECEDENCE[operator] === OPERATOR_PRECEDENCE[parentOperator]) needsParentheses = true
  }
  if (needsParentheses) result = `(${result})`
  return result
}

function expressionToPlaceholderString(expression: Expression, nextSlotIndex = 0, parentOperator: string | null = null, isRightChild = false): [string, number] {
  if (typeof expression === 'number') return [`{${nextSlotIndex}}`, nextSlotIndex + 1]
  const [leftExpr, operator, rightExpr] = expression
  const [leftString, indexAfterLeft] = expressionToPlaceholderString(leftExpr, nextSlotIndex, operator, false)
  const [rightString, indexAfterRight] = expressionToPlaceholderString(rightExpr, indexAfterLeft, operator, true)
  let result = `${leftString}${operator}${rightString}`

  let needsParentheses = false
  if (parentOperator !== null) {
    if (OPERATOR_PRECEDENCE[operator] < OPERATOR_PRECEDENCE[parentOperator]) needsParentheses = true
    if (isRightChild && (operator === '-' || operator === '/') && OPERATOR_PRECEDENCE[operator] === OPERATOR_PRECEDENCE[parentOperator]) needsParentheses = true
  }
  if (needsParentheses) result = `(${result})`
  return [result, indexAfterRight]
}

function tokenizeTemplateString(templateString: string): string[] {
  return templateString.match(/\{[0-9]+\}|\(|\)|[+\-*/]/g) || []
}

// ============================================================================
// TEMPLATE VERIFICATION
// ============================================================================

function generatePermutations<T>(items: T[], selectionSize: number): T[][] {
  const results: T[][] = []
  if (selectionSize > items.length) return results

  function backtrack(chosen: T[], remaining: T[]): void {
    if (chosen.length === selectionSize) { results.push([...chosen]); return }
    for (let i = 0; i < remaining.length; i++) {
      chosen.push(remaining[i])
      backtrack(chosen, [...remaining.slice(0, i), ...remaining.slice(i + 1)])
      chosen.pop()
    }
  }
  backtrack([], items)
  return results
}

function isTemplateSolvable(templateTokens: string[], availableNumbers: number[], target: number): boolean {
  const slotCount = templateTokens.filter(token => token.startsWith('{')).length
  const allPermutations = generatePermutations(availableNumbers, slotCount)

  for (const permutation of allPermutations) {
    let expressionString = ''
    let slotIndex = 0
    for (const token of templateTokens) {
      if (token.startsWith('{')) {
        expressionString += String(permutation[slotIndex])
        slotIndex++
      } else {
        expressionString += token
      }
    }
    try {
      const evaluatedResult = parseAndEvaluateExpression(expressionString)
      if (evaluatedResult[0] === target && evaluatedResult[1] === 1) return true
    } catch {
      continue
    }
  }
  return false
}

// ============================================================================
// SAFE EXPRESSION EVALUATOR (recursive descent parser)
// ============================================================================

function parseAndEvaluateExpression(expressionString: string): Fraction {
  if (!/^[0-9+\-*/() ]+$/.test(expressionString)) {
    throw new Error('Expression contains invalid characters')
  }

  const tokens = expressionString.match(/\d+|[+\-*/()]/g)
  if (!tokens) throw new Error('Empty expression')

  let position = 0

  function peekToken(): string | undefined { return tokens![position] }
  function consumeToken(): string { return tokens![position++] }

  function parseAdditionSubtraction(): Fraction {
    let leftValue = parseMultiplicationDivision()
    while (position < tokens!.length && (peekToken() === '+' || peekToken() === '-')) {
      const operator = consumeToken()
      const rightValue = parseMultiplicationDivision()
      if (operator === '+') leftValue = addFractions(leftValue, rightValue)
      else leftValue = subtractFractions(leftValue, rightValue)
    }
    return leftValue
  }

  function parseMultiplicationDivision(): Fraction {
    let leftValue = parseAtom()
    while (position < tokens!.length && (peekToken() === '*' || peekToken() === '/')) {
      const operator = consumeToken()
      const rightValue = parseAtom()
      if (operator === '*') leftValue = multiplyFractions(leftValue, rightValue)
      else leftValue = divideFractions(leftValue, rightValue)
    }
    return leftValue
  }

  function parseAtom(): Fraction {
    if (peekToken() === '(') {
      consumeToken()
      const value = parseAdditionSubtraction()
      if (peekToken() !== ')') throw new Error('Mismatched parentheses')
      consumeToken()
      return value
    }
    if (peekToken() === '-') {
      consumeToken()
      const value = parseAtom()
      return multiplyFractions([-1, 1], value)
    }
    if (peekToken() === '+') {
      consumeToken()
      return parseAtom()
    }
    const numberString = consumeToken()
    if (!/^\d+$/.test(numberString)) throw new Error(`Unexpected token: ${numberString}`)
    return [parseInt(numberString, 10), 1]
  }

  const result = parseAdditionSubtraction()
  if (position < tokens.length) throw new Error('Unexpected trailing tokens')
  return result
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
  if (numOperands < 2) throw new Error('num_operands must be >= 2')

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const expression = buildRandomExpression(numOperands)

    let evaluatedFraction: Fraction
    try { evaluatedFraction = evaluateExpressionAsFraction(expression) } catch { continue }
    if (evaluatedFraction[1] !== 1) continue

    const targetValue = evaluatedFraction[0]
    if (targetValue < targetMin || targetValue > targetMax) continue

    const usedNumbers = collectLeafValues(expression)
    if (usedNumbers.length !== numOperands || new Set(usedNumbers).size !== numOperands) continue

    const numberBank = [...usedNumbers]
    const decoyPool: number[] = []
    for (let n = MIN_LEAF_VALUE; n <= MAX_LEAF_VALUE; n++) {
      if (!numberBank.includes(n)) decoyPool.push(n)
    }
    if (decoyPool.length < decoys) continue

    const shuffledDecoys = shuffleArray(decoyPool)
    numberBank.push(...shuffledDecoys.slice(0, decoys))
    const shuffledBank = shuffleArray(numberBank)

    const [placeholderString, placeholderCount] = expressionToPlaceholderString(expression, 0)
    const templateTokens = tokenizeTemplateString(placeholderString)
    if (placeholderCount !== numOperands) continue

    if (Math.random() < requireParensProb) {
      if (!templateTokens.includes('(')) continue
    }

    if (!isTemplateSolvable(templateTokens, shuffledBank, targetValue)) continue

    return {
      target: targetValue,
      numbers: shuffledBank,
      solution_expr: expressionToDisplayString(expression),
      used_numbers: usedNumbers,
      max_operand_count: numOperands,
      template_tokens: templateTokens,
      num_placeholders: placeholderCount,
    }
  }

  throw new Error('Failed to generate puzzle; try adjusting parameters')
}

// ============================================================================
// PUZZLE GENERATION: RUSH MODE
// ============================================================================

export function puzzleRush({ difficulty = 1, decoys = 2 } = {}): PuzzleOut {
  if (difficulty < 1 || difficulty > 12) throw new Error('difficulty must be 1-12')
  console.log("difficulty", difficulty)
  const config = DIFFICULTY_CONFIGS[difficulty]

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const expression = buildRandomExpressionConstrained(5, config.ops, config.min_leaf, config.max_leaf)

    let evaluatedFraction: Fraction
    try { evaluatedFraction = evaluateExpressionAsFraction(expression) } catch { continue }
    if (evaluatedFraction[1] !== 1) continue

    const targetValue = evaluatedFraction[0]
    if (targetValue < config.target_min || targetValue > config.target_max) continue

    const usedNumbers = collectLeafValues(expression)
    if (usedNumbers.length !== 5 || new Set(usedNumbers).size !== 5) continue

    const numberBank = [...usedNumbers]
    const decoyPool: number[] = []
    for (let n = config.min_leaf; n <= config.max_leaf; n++) {
      if (!numberBank.includes(n)) decoyPool.push(n)
    }
    if (decoyPool.length < decoys) continue

    const shuffledDecoys = shuffleArray(decoyPool)
    numberBank.push(...shuffledDecoys.slice(0, decoys))
    const shuffledBank = shuffleArray(numberBank)

    const [placeholderString, placeholderCount] = expressionToPlaceholderString(expression, 0)
    const templateTokens = tokenizeTemplateString(placeholderString)
    if (placeholderCount !== 5) continue

    const multiplicationCount = countOperatorOccurrences(expression, '*')
    const divisionCount = countOperatorOccurrences(expression, '/')
    if (config.max_muls !== null && multiplicationCount > config.max_muls) continue
    if (config.max_divs !== null && divisionCount > config.max_divs) continue
    if (divisionCount < (config.min_divs || 0)) continue

    const parenthesisCount = templateTokens.filter(t => t === '(').length
    if (parenthesisCount < config.min_parens || parenthesisCount > config.max_parens) continue

    if (!isTemplateSolvable(templateTokens, shuffledBank, targetValue)) continue

    return {
      target: targetValue,
      numbers: shuffledBank,
      solution_expr: null,
      used_numbers: usedNumbers,
      max_operand_count: 5,
      template_tokens: templateTokens,
      num_placeholders: placeholderCount,
    }
  }

  throw new Error('Failed to generate puzzle')
}

// ============================================================================
// CHECK EXPRESSION
// ============================================================================

export function puzzleCheck({ numbers, expression, target }: { numbers: number[]; expression: string; target?: number }): CheckResult {
  if (!numbers || !expression) throw new Error('Missing numbers or expression')

  const numbersUsedInExpression = (expression.match(/\d+/g) || []).map(Number)

  const availableCounts: Record<number, number> = {}
  for (const n of numbers) availableCounts[n] = (availableCounts[n] || 0) + 1

  const remainingCounts = { ...availableCounts }
  for (const usedNumber of numbersUsedInExpression) {
    if ((remainingCounts[usedNumber] || 0) <= 0) {
      return {
        correct: false,
        reason: 'invalid_expression',
        evaluated: null,
        evaluated_display: null,
        message: `Number ${usedNumber} not available or used too many times`,
      }
    }
    remainingCounts[usedNumber]--
  }

  let evaluatedFraction: Fraction
  try {
    evaluatedFraction = parseAndEvaluateExpression(expression)
  } catch (e: any) {
    const errorMessage = e.message?.includes('Division by zero') ? 'Division by zero' : `Invalid expression: ${e.message}`
    return {
      correct: false,
      reason: 'invalid_expression',
      evaluated: null,
      evaluated_display: null,
      message: errorMessage,
    }
  }

  const evaluatedValue = evaluatedFraction[1] === 1 ? evaluatedFraction[0] : evaluatedFraction[0] / evaluatedFraction[1]
  const evaluatedDisplayString = evaluatedFraction[1] === 1 ? String(evaluatedFraction[0]) : `${evaluatedFraction[0]}/${evaluatedFraction[1]}`

  if (target !== undefined && target !== null) {
    const targetValue = Number(target)
    if (isNaN(targetValue)) {
      return {
        correct: false,
        reason: 'invalid_expression',
        evaluated: evaluatedValue,
        evaluated_display: evaluatedDisplayString,
        message: 'Invalid target value',
      }
    }
    const isCorrect = evaluatedFraction[0] === targetValue && evaluatedFraction[1] === 1
    return {
      correct: isCorrect,
      reason: isCorrect ? 'correct' : 'wrong_value',
      evaluated: evaluatedValue,
      evaluated_display: evaluatedDisplayString,
      message: null,
    }
  }

  return {
    correct: false,
    reason: 'valid_expression',
    evaluated: evaluatedValue,
    evaluated_display: evaluatedDisplayString,
    message: null,
  }
}
