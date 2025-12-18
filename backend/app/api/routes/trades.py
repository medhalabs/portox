from __future__ import annotations

from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status

from app.auth.dependencies import get_current_user
from app.db.duckdb import execute, fetch_all, fetch_one
from app.models.trade import Trade, TradeCreate, TradeUpdate
from app.services.csv_importer import import_trades_csv

router = APIRouter(prefix="/trades", tags=["trades"])


@router.get("", response_model=List[Trade])
def list_trades(user: dict = Depends(get_current_user)) -> List[Trade]:
    rows = fetch_all(
        """
        SELECT id, user_id, symbol, side, quantity, price, trade_time, fees
        FROM trades
        WHERE user_id = ?
        ORDER BY trade_time DESC
        """.strip(),
        [user["id"]],
    )
    return [Trade(**r) for r in rows]


@router.post("", response_model=Trade, status_code=status.HTTP_201_CREATED)
def create_trade(payload: TradeCreate, user: dict = Depends(get_current_user)) -> Trade:
    trade_id = str(uuid4())
    execute(
        "INSERT INTO trades (id, user_id, symbol, side, quantity, price, trade_time, fees) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
            trade_id,
            user["id"],
            payload.symbol.upper(),
            payload.side,
            payload.quantity,
            payload.price,
            payload.trade_time,
            payload.fees,
        ],
    )
    row = fetch_one(
        "SELECT id, user_id, symbol, side, quantity, price, trade_time, fees FROM trades WHERE id = ?",
        [trade_id],
    )
    return Trade(**row)  # type: ignore[arg-type]


@router.put("/{trade_id}", response_model=Trade)
def update_trade(trade_id: str, payload: TradeUpdate, user: dict = Depends(get_current_user)) -> Trade:
    existing = fetch_one("SELECT id FROM trades WHERE id = ? AND user_id = ?", [trade_id, user["id"]])
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trade not found")

    fields = payload.model_dump(exclude_unset=True)
    if "symbol" in fields and fields["symbol"]:
        fields["symbol"] = fields["symbol"].upper()

    if not fields:
        row = fetch_one(
            "SELECT id, user_id, symbol, side, quantity, price, trade_time, fees FROM trades WHERE id = ?",
            [trade_id],
        )
        return Trade(**row)  # type: ignore[arg-type]

    sets = ", ".join([f"{k} = ?" for k in fields.keys()])
    params = list(fields.values()) + [trade_id, user["id"]]
    execute(f"UPDATE trades SET {sets} WHERE id = ? AND user_id = ?", params)

    row = fetch_one(
        "SELECT id, user_id, symbol, side, quantity, price, trade_time, fees FROM trades WHERE id = ?",
        [trade_id],
    )
    return Trade(**row)  # type: ignore[arg-type]


@router.delete("/{trade_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_trade(trade_id: str, user: dict = Depends(get_current_user)) -> Response:
    existing = fetch_one("SELECT id FROM trades WHERE id = ? AND user_id = ?", [trade_id, user["id"]])
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trade not found")

    # Cascade delete journal entries for this trade (manual; schema has no FK constraints)
    execute("DELETE FROM journal_entries WHERE trade_id = ?", [trade_id])
    execute("DELETE FROM trades WHERE id = ? AND user_id = ?", [trade_id, user["id"]])
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/import/csv")
async def import_csv(file: UploadFile = File(...), user: dict = Depends(get_current_user)) -> dict:
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only .csv files are supported")
    content = await file.read()
    try:
        return import_trades_csv(user_id=str(user["id"]), file_bytes=content)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


