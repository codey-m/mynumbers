# app/puzzles.py
import random
import uuid
import re
import ast
import logging
import time
from collections import OrderedDict
from fractions import Fraction
from typing import List, Tuple, Union, Optional, Dict
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Request

logger = logging.getLogger(__name__)
router = APIRouter()

# Round storage with automatic cleanup
ROUNDS: OrderedDict = OrderedDict()
MAX_ROUNDS = 10000  # Prevent memory leaks

Expr = Union[int, Tuple["Expr", str, "Expr"]]
OPS = ["+", "-", "*", "/"]
MAX_LEAF = 19
MIN_LEAF = 1
ATTEMPTS = 2000

# Precedence table for minimal-parentheses printing
OP_PRECEDENCE = {
    "+": 1,
    "-": 1,
    "*": 2,
    "/": 2,
}

# Difficulty configs for rush mode
DIFFICULTY_CONFIGS = {
    1: {
        "ops": ["+"],
        "min_leaf": 1,
        "max_leaf": 10,
        "target_min": 15,
        "target_max": 30,
        "min_parens": 0,
        "max_parens": 0,
    },
    2: {
        "ops": ["+", "-"],
        "min_leaf": 1,
        "max_leaf": 15,
        "target_min": 20,
        "target_max": 40,
        "min_parens": 0,
        "max_parens": 1,
    },
    3: {
        "ops": ["+", "-", "*"],
        "min_leaf": 1,
        "max_leaf": 8,
        "target_min": 30,
        "target_max": 55,
        "min_parens": 0,
        "max_parens": 1,
    },
    4: {
        "ops": ["+", "-", "*"],
        "min_leaf": 2,
        "max_leaf": 12,
        "target_min": 45,
        "target_max": 70,
        "min_parens": 1,
        "max_parens": 2,
    },
    5: {
        "ops": ["+", "-", "*", "/"],
        "min_leaf": 2,
        "max_leaf": 15,
        "target_min": 60,
        "target_max": 90,
        "min_parens": 1,
        "max_parens": 3,
    },
    6: {
        "ops": ["+", "-", "*", "/"],
        "min_leaf": 3,
        "max_leaf": 18,
        "target_min": 80,
        "target_max": 120,
        "min_parens": 2,
        "max_parens": 4,
    },
}


# ============================================================================
# ROUNDS STORAGE MANAGEMENT
# ============================================================================


def add_round(round_id: str, data: Dict) -> None:
    """Add a round with automatic cleanup of old entries."""
    if len(ROUNDS) >= MAX_ROUNDS:
        ROUNDS.popitem(last=False)  # Remove oldest
    ROUNDS[round_id] = {"data": data, "created_at": time.time()}


def get_round(round_id: str) -> Optional[Dict]:
    """Retrieve a round by ID."""
    entry = ROUNDS.get(round_id)
    return entry["data"] if entry else None


# ============================================================================
# EXPRESSION CONSTRUCTION
# ============================================================================


def make_random_expr_constrained(
    num_operands: int, allowed_ops: List[str], min_val: int, max_val: int
) -> Expr:
    """Build expression with constrained operators and values."""
    assert num_operands >= 1
    if num_operands == 1:
        return random.randint(min_val, max_val)
    left_count = random.randint(1, num_operands - 1)
    right_count = num_operands - left_count
    left = make_random_expr_constrained(left_count, allowed_ops, min_val, max_val)
    right = make_random_expr_constrained(right_count, allowed_ops, min_val, max_val)
    op = random.choice(allowed_ops)
    return (left, op, right)


def make_random_expr(num_operands: int) -> Expr:
    """Build random expression with all operators."""
    assert num_operands >= 1
    if num_operands == 1:
        return random.randint(MIN_LEAF, MAX_LEAF)
    left_count = random.randint(1, num_operands - 1)
    right_count = num_operands - left_count
    left = make_random_expr(left_count)
    right = make_random_expr(right_count)
    op = random.choice(OPS)
    return (left, op, right)


def eval_expr_fraction(expr: Expr) -> Fraction:
    """Evaluate expression tree to Fraction (can raise ZeroDivisionError)."""
    if isinstance(expr, int):
        return Fraction(expr)
    left, op, right = expr
    a = eval_expr_fraction(left)
    b = eval_expr_fraction(right)
    if op == "+":
        return a + b
    if op == "-":
        return a - b
    if op == "*":
        return a * b
    if op == "/":
        if b == 0:
            raise ZeroDivisionError("Division by zero in expression")
        return a / b
    raise ValueError("Unknown operator")


def collect_leaves(expr: Expr) -> List[int]:
    """Extract all leaf values from expression tree."""
    if isinstance(expr, int):
        return [expr]
    left, _, right = expr
    return collect_leaves(left) + collect_leaves(right)


# ============================================================================
# MINIMAL-PARENTHESES STRINGIFIERS
# ============================================================================


def expr_to_minimal_value_string(
    expr: Expr, parent_op: Optional[str] = None, is_right: bool = False
) -> str:
    """
    Convert expression to string with actual numbers and minimal parentheses.
    """
    if isinstance(expr, int):
        return str(expr)

    left, op, right = expr
    left_s = expr_to_minimal_value_string(left, op, False)
    right_s = expr_to_minimal_value_string(right, op, True)
    s = f"{left_s}{op}{right_s}"

    need_paren = False
    if parent_op is not None:
        if OP_PRECEDENCE[op] < OP_PRECEDENCE[parent_op]:
            need_paren = True
        if (
            is_right
            and op in ("-", "/")
            and OP_PRECEDENCE[op] == OP_PRECEDENCE[parent_op]
        ):
            need_paren = True

    if need_paren:
        s = f"({s})"
    return s


def expr_to_minimal_placeholder_string(
    expr: Expr, start_index: int = 0, parent_op: Optional[str] = None, is_right: bool = False
) -> Tuple[str, int]:
    """
    Convert expression to placeholder string with minimal parentheses.
    Returns (string_with_placeholders, next_index).
    Leaves are formatted as {i}.
    """
    if isinstance(expr, int):
        return f"{{{start_index}}}", start_index + 1

    left, op, right = expr

    left_s, next_idx = expr_to_minimal_placeholder_string(left, start_index, op, False)
    right_s, next_idx = expr_to_minimal_placeholder_string(right, next_idx, op, True)

    s = f"{left_s}{op}{right_s}"

    need_paren = False
    if parent_op is not None:
        if OP_PRECEDENCE[op] < OP_PRECEDENCE[parent_op]:
            need_paren = True
        if (
            is_right
            and op in ("-", "/")
            and OP_PRECEDENCE[op] == OP_PRECEDENCE[parent_op]
        ):
            need_paren = True

    if need_paren:
        s = f"({s})"
    return s, next_idx


def minimal_tokens_from_placeholder_string(s: str) -> List[str]:
    """
    Tokenize placeholder string like '{0}+{1}*{2}' into tokens:
    ["{0}", "+", "{1}", "*", "{2}"]
    """
    return re.findall(r"\{[0-9]+\}|\(|\)|[+\-*/]", s)


# ============================================================================
# TEMPLATE VERIFICATION
# ============================================================================


def verify_template_solvable(
    template_tokens: List[str], numbers: List[int], target: int
) -> bool:
    """
    Check if ANY permutation of numbers can fill the template slots to reach target.
    Template has fixed operators; we only permute which number goes in which slot.
    """
    from itertools import permutations

    # Count placeholders
    num_slots = sum(1 for t in template_tokens if t.startswith("{"))

    # Try all permutations of numbers (taking num_slots at a time)
    for perm in permutations(numbers, num_slots):
        # Build expression string by filling placeholders
        expr_str = ""
        slot_idx = 0
        for token in template_tokens:
            if token.startswith("{"):
                expr_str += str(perm[slot_idx])
                slot_idx += 1
            else:
                expr_str += token

        # Evaluate and check if it matches target
        try:
            result = safe_eval_to_fraction(expr_str)
            if result == Fraction(target):
                return True
        except (ValueError, ZeroDivisionError, ArithmeticError):
            continue

    return False


# ============================================================================
# SAFE EXPRESSION EVALUATOR
# ============================================================================


def safe_eval_to_fraction(expr_str: str) -> Fraction:
    """
    Parse expression using AST and evaluate with Fraction arithmetic.
    Only allows integers, + - * /, and parentheses.
    """
    if not re.fullmatch(r"[0-9+\-*/()\s]+", expr_str):
        raise ValueError("Expression contains invalid characters")

    try:
        node = ast.parse(expr_str, mode="eval")
    except Exception as e:
        raise ValueError(f"Expression parse error: {e}")

    def _eval(node_) -> Fraction:
        if isinstance(node_, ast.Expression):
            return _eval(node_.body)
        if isinstance(node_, ast.BinOp):
            left = _eval(node_.left)
            right = _eval(node_.right)
            if isinstance(node_.op, ast.Add):
                return left + right
            if isinstance(node_.op, ast.Sub):
                return left - right
            if isinstance(node_.op, ast.Mult):
                return left * right
            if isinstance(node_.op, ast.Div):
                if right == 0:
                    raise ZeroDivisionError("division by zero")
                return left / right
            raise ValueError("Unsupported binary operator")
        if isinstance(node_, ast.UnaryOp):
            val = _eval(node_.operand)
            if isinstance(node_.op, ast.UAdd):
                return val
            if isinstance(node_.op, ast.USub):
                return -val
            raise ValueError("Unsupported unary operator")
        if isinstance(node_, ast.Constant):
            if isinstance(node_.value, int):
                return Fraction(node_.value)
            raise ValueError("Only integer constants allowed")
        if isinstance(node_, ast.Num):  # For older Python versions
            if isinstance(node_.n, int):
                return Fraction(node_.n)
            raise ValueError("Only integer numbers allowed")
        raise ValueError(f"Unsupported AST node: {type(node_)}")

    return _eval(node)


# ============================================================================
# API MODELS
# ============================================================================


class PuzzleOut(BaseModel):
    round_id: str
    target: int
    numbers: List[int]
    solution_expr: Optional[str] = None
    used_numbers: List[int]
    max_operand_count: int
    template_tokens: List[str]
    num_placeholders: int


# ============================================================================
# API ENDPOINT: NEW PUZZLE (PRACTICE MODE)
# ============================================================================


@router.get("/puzzle/new", response_model=PuzzleOut)
def puzzle_new(
    num_operands: int = 5,
    decoys: int = 1,
    show_solution: bool = False,
    target_min: int = 10,
    target_max: int = 150,
    require_parens_prob: float = 0.6,
):
    """Generate a new puzzle for practice mode."""
    logger.info(f"puzzle_new called: num_operands={num_operands}, decoys={decoys}")

    if num_operands < 2:
        raise HTTPException(status_code=400, detail="num_operands must be >= 2")

    for attempt in range(ATTEMPTS):
        # 1. Generate random expression tree
        expr = make_random_expr(num_operands)

        # 2. Evaluate to get target
        try:
            result = eval_expr_fraction(expr)
        except ZeroDivisionError:
            continue

        # 3. Only accept integer results
        if result.denominator != 1:
            continue

        val = int(result.numerator)

        # 4. Check target is in requested range
        if not (target_min <= val <= target_max):
            continue

        # 5. Extract numbers used in solution
        used = collect_leaves(expr)
        if len(used) != num_operands or len(set(used)) != num_operands:
            continue

        # 6. Add decoys to the pool
        numbers = used.copy()
        decoy_pool = [n for n in range(MIN_LEAF, MAX_LEAF + 1) if n not in numbers]

        if len(decoy_pool) < decoys:
            continue  # Not enough decoys available

        random.shuffle(decoy_pool)
        numbers.extend(decoy_pool[:decoys])
        random.shuffle(numbers)

        # 7. Create template with FIXED operator positions
        placeholder_str, placeholder_count = expr_to_minimal_placeholder_string(expr, 0)
        tokens = minimal_tokens_from_placeholder_string(placeholder_str)

        # 8. Sanity check: placeholder count matches operands
        if placeholder_count != num_operands:
            continue

        # 9. Check parentheses requirement (cheap check)
        if random.random() < require_parens_prob:
            if "(" not in tokens:
                continue

        # 10. Verify template is solvable with these numbers (expensive check last)
        if not verify_template_solvable(tokens, numbers, val):
            continue

        # 11. All checks passed - prepare solution and return
        solution = expr_to_minimal_value_string(expr)

        round_id = uuid.uuid4().hex
        add_round(
            round_id,
            {
                "solution": solution,
                "numbers": numbers,
                "target": val,
                "template_tokens": tokens,
                "num_placeholders": placeholder_count,
            },
        )

        logger.info(f"Generated puzzle: target={val}, attempt={attempt+1}")
        return PuzzleOut(
            round_id=round_id,
            target=val,
            numbers=numbers,
            solution_expr=solution if show_solution else None,
            used_numbers=used,
            max_operand_count=num_operands,
            template_tokens=tokens,
            num_placeholders=placeholder_count,
        )

    logger.warning(f"Failed to generate puzzle after {ATTEMPTS} attempts")
    raise HTTPException(
        status_code=500, detail="Failed to generate puzzle; try adjusting parameters"
    )


# ============================================================================
# API ENDPOINT: RUSH MODE PUZZLE
# ============================================================================


@router.get("/puzzle/rush", response_model=PuzzleOut)
def puzzle_rush(difficulty: int = 1, decoys: int = 2):
    """Generate puzzle for rush mode with difficulty 1-6."""
    if not 1 <= difficulty <= 6:
        raise HTTPException(status_code=400, detail="difficulty must be 1-6")

    config = DIFFICULTY_CONFIGS[difficulty]
    logger.info(f"puzzle_rush called: difficulty={difficulty}, decoys={decoys}")

    for attempt in range(ATTEMPTS):
        # 1. Generate expression with difficulty-constrained operators and values
        expr = make_random_expr_constrained(
            num_operands=5,
            allowed_ops=config["ops"],
            min_val=config["min_leaf"],
            max_val=config["max_leaf"],
        )

        # 2. Evaluate expression
        try:
            result = eval_expr_fraction(expr)
        except ZeroDivisionError:
            continue

        # 3. Only accept integer results
        if result.denominator != 1:
            continue

        val = int(result.numerator)

        # 4. Check target is in difficulty range
        if not (config["target_min"] <= val <= config["target_max"]):
            continue

        # 5. Extract numbers used in solution
        used = collect_leaves(expr)
        if len(used) != 5 or len(set(used)) != 5:
            continue

        # 6. Add decoys to create the number pool
        numbers = used.copy()
        decoy_pool = [
            n
            for n in range(config["min_leaf"], config["max_leaf"] + 1)
            if n not in numbers
        ]

        if len(decoy_pool) < decoys:
            continue  # Not enough decoys available

        random.shuffle(decoy_pool)
        numbers.extend(decoy_pool[:decoys])
        random.shuffle(numbers)

        # 7. Create template with FIXED operator positions (minimal parentheses)
        placeholder_str, placeholder_count = expr_to_minimal_placeholder_string(expr, 0)
        tokens = minimal_tokens_from_placeholder_string(placeholder_str)

        if placeholder_count != 5:
            continue

        # 8. Enforce parentheses bounds for this difficulty (cheap check)
        paren_count = tokens.count("(")
        if not (config["min_parens"] <= paren_count <= config["max_parens"]):
            continue

        # 9. Verify: Can this template be solved with these numbers? (expensive check last)
        if not verify_template_solvable(tokens, numbers, val):
            continue

        # 10. Template is solvable - prepare solution string
        solution = expr_to_minimal_value_string(expr)

        # 11. Store and return puzzle
        round_id = uuid.uuid4().hex
        add_round(
            round_id,
            {
                "solution": solution,
                "numbers": numbers,
                "target": val,
                "template_tokens": tokens,
                "num_placeholders": placeholder_count,
            },
        )

        logger.info(
            f"Generated rush puzzle: difficulty={difficulty}, target={val}, attempt={attempt+1}"
        )
        return PuzzleOut(
            round_id=round_id,
            target=val,
            numbers=numbers,
            solution_expr=None,
            used_numbers=used,
            max_operand_count=5,
            template_tokens=tokens,
            num_placeholders=placeholder_count,
        )

    logger.warning(
        f"Failed to generate rush puzzle (difficulty={difficulty}) after {ATTEMPTS} attempts"
    )
    raise HTTPException(status_code=500, detail="Failed to generate puzzle")


# ============================================================================
# API ENDPOINT: CHECK EXPRESSION
# ============================================================================


@router.post("/puzzle/check")
async def puzzle_check(request: Request):
    """
    Expects JSON: { numbers: [ints], expression: "((1+2)*3)-4", target: optional int }
    """
    payload = await request.json()
    numbers = payload.get("numbers")
    expression = payload.get("expression")

    if numbers is None or expression is None:
        raise HTTPException(status_code=400, detail="Missing numbers or expression")

    # Extract integers used in the expression
    used_number_strs = re.findall(r"\d+", expression)
    used_numbers = [int(s) for s in used_number_strs]

    # Check counts against provided bank
    bank_counts: Dict[int, int] = {}
    for n in numbers:
        bank_counts[n] = bank_counts.get(n, 0) + 1

    temp_counts = bank_counts.copy()
    for u in used_numbers:
        if temp_counts.get(u, 0) <= 0:
            return {
                "correct": False,
                "reason": "invalid_expression",
                "evaluated": None,
                "evaluated_display": None,
                "message": f"Number {u} not available or used too many times",
            }
        temp_counts[u] -= 1

    # Evaluate expression safely
    try:
        val_frac = safe_eval_to_fraction(expression)
    except ZeroDivisionError:
        return {
            "correct": False,
            "reason": "invalid_expression",
            "evaluated": None,
            "evaluated_display": None,
            "message": "Division by zero",
        }
    except Exception as e:
        return {
            "correct": False,
            "reason": "invalid_expression",
            "evaluated": None,
            "evaluated_display": None,
            "message": f"Invalid expression: {e}",
        }

    # Format the evaluated result for display
    if val_frac.denominator == 1:
        evaluated = int(val_frac)
        evaluated_display = str(evaluated)
    else:
        evaluated = float(val_frac)
        evaluated_display = f"{val_frac.numerator}/{val_frac.denominator}"

    if "target" in payload:
        try:
            target_val = int(payload.get("target"))
        except Exception:
            return {
                "correct": False,
                "reason": "invalid_expression",
                "evaluated": evaluated,
                "evaluated_display": evaluated_display,
                "message": "Invalid target value",
            }
        correct = val_frac == Fraction(target_val)
        return {
            "correct": correct,
            "reason": "correct" if correct else "wrong_value",
            "evaluated": evaluated,
            "evaluated_display": evaluated_display,
            "message": None,
        }

    return {
        "correct": False,
        "reason": "valid_expression",
        "evaluated": evaluated,
        "evaluated_display": evaluated_display,
        "message": None,
    }

# ============================================================================
# API ENDPOINT: REVEAL SOLUTION
# ============================================================================


@router.get("/puzzle/reveal")
def puzzle_reveal(round_id: str):
    """Reveal the solution for a given puzzle round."""
    round_data = get_round(round_id)
    if round_data is None:
        raise HTTPException(status_code=404, detail="Round not found")
    return {"solution": round_data["solution"]}