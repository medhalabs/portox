from __future__ import annotations

from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from fastapi.responses import StreamingResponse

from app.auth.dependencies import get_current_user
from app.db.duckdb import execute, fetch_all, fetch_one
from app.models.trade import Trade, TradeCreate, TradeUpdate
from app.services.csv_importer import import_trades_csv
from app.services.export_service import export_trades_csv, export_trades_excel

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


@router.get("/export/csv")
def export_csv(user: dict = Depends(get_current_user)) -> StreamingResponse:
    """Export all trades to CSV"""
    rows = fetch_all(
        """
        SELECT id, symbol, side, quantity, price, trade_time, fees
        FROM trades
        WHERE user_id = ?
        ORDER BY trade_time DESC
        """.strip(),
        [user["id"]],
    )
    trades = [dict(r) for r in rows]
    csv_data = export_trades_csv(trades)
    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=trades_export.csv"},
    )


@router.get("/export/excel")
def export_excel(user: dict = Depends(get_current_user)) -> StreamingResponse:
    """Export trades to Excel with journal data"""
    rows = fetch_all(
        """
        SELECT id, symbol, side, quantity, price, trade_time, fees
        FROM trades
        WHERE user_id = ?
        ORDER BY trade_time DESC
        """.strip(),
        [user["id"]],
    )
    trades = [dict(r) for r in rows]
    
    # Load journal tags
    journal_rows = fetch_all(
        """
        SELECT je.trade_id, je.strategy, je.emotion, je.notes, je.created_at
        FROM journal_entries je
        JOIN trades t ON t.id = je.trade_id
        WHERE t.user_id = ?
        ORDER BY je.created_at DESC
        """.strip(),
        [user["id"]],
    )
    journal_tags: dict = {}
    for r in journal_rows:
        tid = str(r["trade_id"])
        if tid not in journal_tags:
            journal_tags[tid] = {
                "strategy": r.get("strategy"),
                "emotion": r.get("emotion"),
                "notes": r.get("notes"),
            }
    
    excel_data = export_trades_excel(trades, journal_by_trade_id=journal_tags)
    return StreamingResponse(
        iter([excel_data]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=trades_export.xlsx"},
    )


