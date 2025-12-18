from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from dateutil import parser as dtparser

from app.db.duckdb import execute, fetch_one


def _norm(s: Any) -> str:
    return str(s).strip()


def _parse_side(v: str) -> str:
    v = _norm(v).upper()
    if v in {"BUY", "B"}:
        return "BUY"
    if v in {"SELL", "S"}:
        return "SELL"
    if v in {"BUY/SELL", "B/S"}:
        raise ValueError("Ambiguous side")
    # Some broker exports use transaction_type
    if v in {"SELLL"}:
        return "SELL"
    raise ValueError(f"Invalid side: {v}")


def _parse_int(v: Any) -> int:
    s = _norm(v)
    if s == "":
        raise ValueError("Missing integer")
    return int(float(s))


def _parse_float(v: Any) -> float:
    s = _norm(v).replace(",", "")
    if s == "":
        return 0.0
    return float(s)


def _parse_dt(v: Any) -> datetime:
    s = _norm(v)
    if not s:
        raise ValueError("Missing datetime")
    dt = dtparser.parse(s)
    # Store as UTC if timezone-aware; else keep as-is but treat as UTC-ish for consistency.
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _detect_format(headers: List[str]) -> str:
    h = {x.lower().strip() for x in headers}
    # Zerodha / Upstox variants (best-effort; formats evolve)
    if "tradingsymbol" in h or "trading_symbol" in h:
        return "zerodha_like"
    if "instrument" in h and ("buy/sell" in h or "transaction_type" in h):
        return "upstox_like"
    return "generic"


def _map_row(fmt: str, row: Dict[str, Any]) -> Dict[str, Any]:
    keys = {k.lower().strip(): k for k in row.keys()}

    def get(*candidates: str) -> Optional[str]:
        for c in candidates:
            if c in keys and row.get(keys[c]) not in (None, ""):
                return row.get(keys[c])
        return None

    symbol = get("symbol", "tradingsymbol", "trading_symbol", "instrument")
    side = get("side", "buy/sell", "transaction_type")
    qty = get("quantity", "qty", "filled_qty", "filled quantity")
    price = get("price", "average_price", "avg_price", "average price")
    ttime = get("trade_time", "trade time", "exchange_timestamp", "exchange timestamp", "order_execution_time")
    fees = get("fees", "brokerage", "charges", "total_charges", "total charges")

    if not symbol or not side or not qty or not price or not ttime:
        raise ValueError("Missing required columns (symbol/side/qty/price/trade_time)")

    return {
        "symbol": _norm(symbol).upper(),
        "side": _parse_side(_norm(side)),
        "quantity": _parse_int(qty),
        "price": float(_parse_float(price)),
        "trade_time": _parse_dt(ttime),
        "fees": float(_parse_float(fees)) if fees is not None else 0.0,
    }


def _is_duplicate(user_id: str, trade: Dict[str, Any]) -> bool:
    existing = fetch_one(
        """
        SELECT id FROM trades
        WHERE user_id = ?
          AND upper(symbol) = upper(?)
          AND side = ?
          AND quantity = ?
          AND price = ?
          AND trade_time = ?
        """.strip(),
        [user_id, trade["symbol"], trade["side"], trade["quantity"], trade["price"], trade["trade_time"]],
    )
    return existing is not None


def import_trades_csv(user_id: str, file_bytes: bytes) -> Dict[str, Any]:
    text = file_bytes.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise ValueError("CSV is missing headers")

    fmt = _detect_format(reader.fieldnames)
    total = 0
    inserted = 0
    duplicates = 0
    invalid: List[Dict[str, Any]] = []

    for idx, row in enumerate(reader, start=2):  # 1=header
        total += 1
        try:
            trade = _map_row(fmt, row)
            if trade["quantity"] <= 0 or trade["price"] <= 0:
                raise ValueError("quantity/price must be > 0")
            if _is_duplicate(user_id, trade):
                duplicates += 1
                continue
            execute(
                "INSERT INTO trades (id, user_id, symbol, side, quantity, price, trade_time, fees) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    str(uuid4()),
                    user_id,
                    trade["symbol"],
                    trade["side"],
                    trade["quantity"],
                    trade["price"],
                    trade["trade_time"],
                    trade["fees"],
                ],
            )
            inserted += 1
        except Exception as e:
            invalid.append({"row": idx, "error": str(e)})

    return {
        "detected_format": fmt,
        "total_rows": total,
        "inserted": inserted,
        "duplicates_ignored": duplicates,
        "invalid_rows": invalid,
    }


