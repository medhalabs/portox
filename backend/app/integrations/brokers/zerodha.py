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
    raise ValueError(f"Invalid side: {s}")


def fetch_trades(api_key: str, access_token: str) -> List[NormalizedTrade]:
    """
    Best-effort Zerodha fetch.
    NOTE: Kite Connect typically exposes executed trades for the current day via /trades.
    Historical importing may still require CSV/contract notes.
    """
    url = f"{settings.zerodha_base_url}{settings.zerodha_trades_path}"
    headers = {
        "X-Kite-Version": "3",
        "Authorization": f"token {api_key}:{access_token}",
    }
    with httpx.Client(timeout=30) as client:
        r = client.get(url, headers=headers)
        r.raise_for_status()
        payload: Dict[str, Any] = r.json()

    rows = payload.get("data") or payload.get("trades") or []
    out: List[NormalizedTrade] = []
    for row in rows:
        # Common Kite fields: tradingsymbol, transaction_type, quantity, price, exchange_timestamp/order_timestamp
        symbol = str(row.get("tradingsymbol") or row.get("trading_symbol") or row.get("symbol") or "").strip().upper()
        if not symbol:
            raise ValueError("Missing symbol")
        side = _parse_side(row.get("transaction_type") or row.get("side"))
        qty = int(float(row.get("quantity") or row.get("qty")))
        price = float(row.get("price") or row.get("average_price") or row.get("avg_price"))
        ttime = _parse_dt(
            row.get("exchange_timestamp")
            or row.get("order_timestamp")
            or row.get("fill_timestamp")
            or row.get("trade_time")
        )
        out.append(NormalizedTrade(symbol=symbol, side=side, quantity=qty, price=price, trade_time=ttime, fees=0.0))
    return out


