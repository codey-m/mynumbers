# app/puzzles.py
import random
import uuid
import re
import ast
from fractions import Fraction
from typing import List, Tuple, Union, Optional, Dict
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Request

router = APIRouter()
ROUNDS = {}

Expr = Union[int, Tuple["Expr", str, "Expr"]]
OPS = ["+", "-", "*", "/"]
MAX_LEAF = 19
MIN_LEAF = 1
ATTEMPTS = 2000

# precedence table used for minimal-parentheses printing
OP_PRECEDENCE = {
    "+": 1,
    "-": 1,
    "*": 2,
    "/": 2,
}


# -------------------------
# Expression construction
# -------------------------

def make_random_expr(num_operands: int) -> Expr:
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
        return a / b
    raise ValueError("Unknown op")


def collect_leaves(expr: Expr) -> List[int]:
    if isinstance(expr, int):
        return [expr]
    left, _, right = expr
    return collect_leaves(left) + collect_leaves(right)


# ----------------------------------------
# Minimal-parentheses stringifiers
# ----------------------------------------

def expr_to_minimal_value_string(expr: Expr, parent_op: Optional[str] = None, is_right: bool = False) -> str:
    """
    Returns a string of the expression with actual numbers and minimal parentheses.
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
        if is_right and op in ("-", "/") and OP_PRECEDENCE[op] == OP_PRECEDENCE[parent_op]:
            need_paren = True

    if need_paren:
        s = f"({s})"
    return s


def expr_to_minimal_placeholder_string(expr: Expr, start_index: int = 0,
                                       parent_op: Optional[str] = None,
                                       is_right: bool = False) -> Tuple[str, int]:
    """
    Returns (string_with_placeholders, next_index).
    Leaves are formatted as {i}. Parentheses are added only when required.
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
        if is_right and op in ("-", "/") and OP_PRECEDENCE[op] == OP_PRECEDENCE[parent_op]:
            need_paren = True

    if need_paren:
        s = f"({s})"
    return s, next_idx


def minimal_tokens_from_placeholder_string(s: str) -> List[str]:
    """
    Tokenize a string like '( {0}+{1} )*{2}' into tokens:
    ["(", "{0}", "+", "{1}", ")", "*", "{2}"]
    """
    return re.findall(r"\{[0-9]+\}|\(|\)|[+\-*/]", s)


# ----------------------------------------
# Tokenization (kept for fallback)
# ----------------------------------------

def expr_to_tokens_raw(expr: Expr, start_index: int = 0) -> Tuple[List[str], int]:
    if isinstance(expr, int):
        return [f"{{{start_index}}}"], start_index + 1
    left, op, right = expr
    left_tokens, next_idx = expr_to_tokens_raw(left, start_index)
    right_tokens, next_idx = expr_to_tokens_raw(right, next_idx)
    return ["("] + left_tokens + [op] + right_tokens + [")"], next_idx


def strip_outermost_parens_if_wrapping(tokens: List[str]) -> List[str]:
    if not tokens or tokens[0] != "(" or tokens[-1] != ")":
        return tokens
    count = 0
    wrapped = True
    for i, t in enumerate(tokens):
        if t == "(":
            count += 1
        elif t == ")":
            count -= 1
        if count == 0 and i < len(tokens) - 1:
            wrapped = False
            break
    if wrapped:
        return tokens[1:-1]
    return tokens


# -------------------------
# Solver (verification)
# -------------------------

def solver_find_expression(numbers: List[int], target: int) -> Optional[str]:
    from functools import lru_cache
    initial = tuple((Fraction(n), str(n)) for n in numbers)

    @lru_cache(maxsize=None)
    def search(state):
        items = []
        for token in state.split(";"):
            if not token:
                continue
            num_s, expr_s = token.split("|", 1)
            if "/" in num_s:
                num, den = num_s.split("/")
                items.append((Fraction(int(num), int(den)), expr_s))
            else:
                items.append((Fraction(int(num_s)), expr_s))
        if len(items) == 1:
            val, expr = items[0]
            if val == Fraction(target):
                return expr
            return None
        n = len(items)
        for i in range(n):
            for j in range(n):
                if i == j:
                    continue
                a_val, a_expr = items[i]
                b_val, b_expr = items[j]
                rest = [items[k] for k in range(n) if k != i and k != j]
                pairs_to_try = [
                    (a_val + b_val, f"({a_expr}+{b_expr})"),
                    (a_val - b_val, f"({a_expr}-{b_expr})"),
                    (a_val * b_val, f"({a_expr}*{b_expr})"),
                ]
                if b_val != 0:
                    pairs_to_try.append((a_val / b_val, f"({a_expr}/{b_expr})"))
                for new_val, new_expr in pairs_to_try:
                    new_items = rest + [(new_val, new_expr)]
                    tokens = []
                    for v, e in new_items:
                        tokens.append(f"{v.numerator}/{v.denominator}|{e}")
                    new_state = ";".join(tokens)
                    found = search(new_state)
                    if found:
                        return found
        return None

    tokens = [f"{f.numerator}/{f.denominator}|{s}" for (f, s) in initial]
    start_state = ";".join(tokens)
    return search(start_state)


# -------------------------
# API Models
# -------------------------

class PuzzleOut(BaseModel):
    round_id: str
    target: int
    numbers: List[int]
    solution_expr: Optional[str] = None
    used_numbers: List[int]
    max_operand_count: int
    template_tokens: List[str]
    num_placeholders: int


# -------------------------
# API Endpoint: new puzzle
# -------------------------

@router.get("/puzzle/new", response_model=PuzzleOut)
def puzzle_new(
    num_operands: int = 5,
    decoys: int = 1,
    show_solution: bool = False,
    target_min: int = 10,
    target_max: int = 150,
    require_parens_prob: float = 0.6,
):
    print("PUZZLE_NEW CALLED, num_operands =", num_operands)
    if num_operands < 2:
        raise HTTPException(status_code=400, detail="num_operands must be >= 2")

    for _ in range(ATTEMPTS):
        expr = make_random_expr(num_operands)
        try:
            result = eval_expr_fraction(expr)
        except ZeroDivisionError:
            continue
        if result.denominator != 1:
            continue
        val = int(result.numerator)
        if not (target_min <= val <= target_max):
            continue

        used = collect_leaves(expr)
        if len(used) != num_operands:
            continue

        # enforce distinct leaves (no duplicates in solution)
        if len(set(used)) != num_operands:
            continue

        # prepare numbers (used + decoys)
        numbers = used.copy()
        decoy_pool = [n for n in range(MIN_LEAF, MAX_LEAF + 1) if n not in numbers]
        random.shuffle(decoy_pool)
        numbers.extend(decoy_pool[:decoys])
        random.shuffle(numbers)

        # verify solvability using the chosen numbers
        verified = solver_find_expression(numbers, val)
        if verified is None:
            continue

        # minimal-parentheses solution string (numbers)
        solution = expr_to_minimal_value_string(expr)

        # minimal placeholder template string -> tokens
        placeholder_str, placeholder_count = expr_to_minimal_placeholder_string(expr, 0)
        tokens = minimal_tokens_from_placeholder_string(placeholder_str)

        # defensive sanity-check
        if placeholder_count != num_operands:
            continue

        if random.random() < require_parens_prob:
            if "(" not in tokens:
                continue

        round_id = uuid.uuid4().hex
        ROUNDS[round_id] = {
            "solution": solution,
            "numbers": numbers,
            "target": val,
            "template_tokens": tokens,
            "num_placeholders": placeholder_count,
        }

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

    raise HTTPException(status_code=500, detail="Failed to generate puzzle; try adjusting parameters")


# -------------------------
# Safe expression evaluator using AST -> returns Fraction
# -------------------------

def safe_eval_to_fraction(expr_str: str) -> Fraction:
    """
    Parse expression using ast and evaluate with Fraction arithmetic.
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
        if isinstance(node_, ast.Num):
            if isinstance(node_.n, int):
                return Fraction(node_.n)
            raise ValueError("Only integer numbers allowed")
        raise ValueError(f"Unsupported AST node: {type(node_)}")

    return _eval(node)


# -------------------------
# API Endpoint: check expression
# -------------------------

@router.post("/puzzle/check")
async def puzzle_check(request: Request):
    """
    Expects JSON: { numbers: [ints], expression: "((1+2)*3)-4", target: optional int }
    Returns JSON:
      {
        correct: bool (only meaningful if target provided),
        reason: "correct" | "wrong_value" | "invalid_expression" | "valid_expression",
        evaluated: <int or float>,
        message: <optional string>
      }
    """
    payload = await request.json()
    numbers = payload.get("numbers")
    expression = payload.get("expression")

    if numbers is None or expression is None:
        raise HTTPException(status_code=400, detail="Missing numbers or expression")

    # extract integers used in the expression
    used_number_strs = re.findall(r"\d+", expression)
    used_numbers = [int(s) for s in used_number_strs]

    # check counts against provided bank (each bank element can be used at most once)
    bank_counts: Dict[int, int] = {}
    for n in numbers:
        bank_counts[n] = bank_counts.get(n, 0) + 1

    temp_counts = bank_counts.copy()
    for u in used_numbers:
        if temp_counts.get(u, 0) <= 0:
            return {
                "correct": False if "target" in payload else False,
                "reason": "invalid_expression",
                "evaluated": None,
                "message": f"Number {u} not available or used too many times"
            }
        temp_counts[u] -= 1

    # Evaluate expression safely
    try:
        val_frac = safe_eval_to_fraction(expression)
    except ZeroDivisionError:
        return {
            "correct": False if "target" in payload else False,
            "reason": "invalid_expression",
            "evaluated": None,
            "message": "Division by zero"
        }
    except Exception as e:
        return {
            "correct": False if "target" in payload else False,
            "reason": "invalid_expression",
            "evaluated": None,
            "message": f"Invalid expression: {e}"
        }

    evaluated = int(val_frac) if val_frac.denominator == 1 else float(val_frac)

    if "target" in payload:
        try:
            target_val = int(payload.get("target"))
        except Exception:
            return {
                "correct": False,
                "reason": "invalid_expression",
                "evaluated": evaluated,
                "message": "Invalid target value"
            }
        correct = (val_frac == Fraction(target_val))
        return {
            "correct": correct,
            "reason": "correct" if correct else "wrong_value",
            "evaluated": evaluated,
            "message": None
        }

    return {
        "correct": False,
        "reason": "valid_expression",
        "evaluated": evaluated,
        "message": None
    }


# -------------------------
# API Endpoint: reveal
# -------------------------

@router.get("/puzzle/reveal")
def puzzle_reveal(round_id: str):
    if round_id not in ROUNDS:
        raise HTTPException(status_code=404, detail="Round not found")
    return {"solution": ROUNDS[round_id]["solution"]}
