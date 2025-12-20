from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.db.postgresql import execute, fetch_one


def is_duplicate_trade(user_id: str, trade: Dict[str, Any]) -> bool:
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


def insert_trade(user_id: str, trade: Dict[str, Any]) -> None:
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
            trade.get("fees", 0.0),
        ],
    )


def ingest_trades(user_id: str, trades: List[Dict[str, Any]]) -> Dict[str, Any]:
    inserted = 0
    duplicates = 0
    invalid: List[Dict[str, Any]] = []

    for idx, t in enumerate(trades, start=1):
        try:
            if is_duplicate_trade(user_id, t):
                duplicates += 1
                continue
            insert_trade(user_id, t)
            inserted += 1
        except Exception as e:
            invalid.append({"row": idx, "error": str(e)})

    return {"fetched": len(trades), "inserted": inserted, "duplicates_ignored": duplicates, "invalid_rows": invalid}


