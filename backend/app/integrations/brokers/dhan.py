from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx
from dateutil import parser as dtparser

from app.config import settings
from app.integrations.brokers.types import NormalizedTrade


def _parse_dt(v: Any) -> datetime:
    if v is None:
        raise ValueError("Missing datetime")
    dt = dtparser.parse(str(v))
    return dt.replace(tzinfo=None) if dt.tzinfo else dt


def _parse_side(v: Any) -> str:
    s = str(v).strip().upper()
    if s in {"BUY", "SELL"}:
        return s
    if s in {"B", "S"}:
        return "BUY" if s == "B" else "SELL"
    raise ValueError(f"Invalid side: {s}")


def fetch_trades(access_token: str, client_id: Optional[str] = None) -> List[NormalizedTrade]:
    """
    Best-effort DhanHQ fetch (read-only).
    Auth schemes can vary; configurable via:
      - DHAN_AUTH_SCHEME (default Bearer)
      - DHAN_TRADES_PATH (default /trades)

    If DHAN_AUTH_SCHEME == "Bearer": Authorization: Bearer <token>
    If DHAN_AUTH_SCHEME == "access-token": uses headers access-token/client-id
    """
    url = f"{settings.dhan_base_url}{settings.dhan_trades_path}"

    headers: Dict[str, str] = {}
    scheme = (settings.dhan_auth_scheme or "Bearer").strip()
    if scheme.lower() == "bearer":
        headers["Authorization"] = f"Bearer {access_token}"
    elif scheme.lower() in {"access-token", "access_token"}:
        headers["access-token"] = access_token
        if client_id:
            headers["client-id"] = client_id
    else:
        raise ValueError(f"Unsupported DHAN_AUTH_SCHEME: {scheme}")

    with httpx.Client(timeout=30) as client:
        r = client.get(url, headers=headers)
        r.raise_for_status()
        payload: Dict[str, Any] = r.json()

    rows = payload.get("data") or payload.get("trades") or payload.get("tradeBook") or []
    out: List[NormalizedTrade] = []
    for row in rows:
        symbol = str(row.get("tradingSymbol") or row.get("trading_symbol") or row.get("symbol") or "").strip().upper()
        if not symbol:
            raise ValueError("Missing symbol")
        side = _parse_side(row.get("transactionType") or row.get("transaction_type") or row.get("side"))
        qty = int(float(row.get("quantity") or row.get("qty") or row.get("filledQty") or row.get("filled_qty")))
        price = float(row.get("price") or row.get("averagePrice") or row.get("average_price") or row.get("avg_price"))
        ttime = _parse_dt(row.get("tradeTime") or row.get("trade_time") or row.get("exchangeTimestamp") or row.get("timestamp"))
        fees = float(row.get("fees") or row.get("charges") or 0.0)
        out.append(NormalizedTrade(symbol=symbol, side=side, quantity=qty, price=price, trade_time=ttime, fees=fees))
    return out


