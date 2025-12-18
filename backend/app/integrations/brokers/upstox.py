from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

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


def fetch_trades(access_token: str) -> List[NormalizedTrade]:
    """
    Best-effort Upstox fetch (read-only).
    Endpoint/path varies by API version & account type; configurable via settings:
      - UPSTOX_BASE_URL (default https://api.upstox.com/v2)
      - UPSTOX_TRADES_PATH (default /trade/history)
    """
    url = f"{settings.upstox_base_url}{settings.upstox_trades_path}"
    headers = {"Authorization": f"Bearer {access_token}"}
    with httpx.Client(timeout=30) as client:
        r = client.get(url, headers=headers)
        r.raise_for_status()
        payload: Dict[str, Any] = r.json()

    rows = payload.get("data") or payload.get("trades") or []
    out: List[NormalizedTrade] = []
    for row in rows:
        symbol = str(row.get("trading_symbol") or row.get("tradingsymbol") or row.get("symbol") or "").strip().upper()
        if not symbol:
            raise ValueError("Missing symbol")
        side = _parse_side(row.get("transaction_type") or row.get("side"))
        qty = int(float(row.get("quantity") or row.get("qty") or row.get("filled_qty")))
        price = float(row.get("price") or row.get("average_price") or row.get("avg_price"))
        ttime = _parse_dt(row.get("trade_time") or row.get("exchange_timestamp") or row.get("timestamp"))
        fees = float(row.get("fees") or row.get("charges") or 0.0)
        out.append(NormalizedTrade(symbol=symbol, side=side, quantity=qty, price=price, trade_time=ttime, fees=fees))
    return out


