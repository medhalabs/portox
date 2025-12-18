from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Literal, Optional, Tuple


Side = Literal["BUY", "SELL"]


@dataclass
class TradeRow:
    id: str
    user_id: str
    symbol: str
    side: Side
    quantity: int
    price: float
    trade_time: datetime
    fees: float


@dataclass
class Lot:
    qty: int
    trade_id: str
    price: float
    fee_per_share: float
    time: datetime


@dataclass
class RealizedMatch:
    symbol: str
    qty: int
    entry_trade_id: str
    exit_trade_id: str
    entry_price: float
    exit_price: float
    entry_time: datetime
    exit_time: datetime
    side_closed: Literal["LONG", "SHORT"]
    pnl: float


def _fee_per_share(qty: int, fees: float) -> float:
    if qty <= 0:
        return 0.0
    return float(fees or 0.0) / float(qty)


def compute_fifo(
    trades: List[TradeRow],
) -> Tuple[List[RealizedMatch], Dict[str, Dict[str, List[Lot]]], Dict[str, float]]:
    """
    Returns:
      - realized matches (each match is a closed chunk of qty)
      - open lots per symbol (long_lots / short_lots)
      - mark price per symbol (last traded price)

    Notes:
      - Supports shorts: SELL opens short if no longs; BUY closes shorts first.
      - No external market data: mark price is last trade price per symbol (server-side).
    """
    trades_sorted = sorted(trades, key=lambda t: t.trade_time)
    realized: List[RealizedMatch] = []
    positions: Dict[str, Dict[str, List[Lot]]] = {}
    mark: Dict[str, float] = {}

    for t in trades_sorted:
        sym = t.symbol.upper().strip()
        positions.setdefault(sym, {"long": [], "short": []})
        mark[sym] = float(t.price)

        if t.side == "BUY":
            remaining = t.quantity
            buy_fee_ps = _fee_per_share(t.quantity, t.fees)

            # Close shorts first
            shorts = positions[sym]["short"]
            while remaining > 0 and shorts:
                lot = shorts[0]
                m = min(remaining, lot.qty)
                # Short pnl: entry (sell) - exit (buy)
                pnl = (lot.price - t.price) * m - (lot.fee_per_share + buy_fee_ps) * m
                realized.append(
                    RealizedMatch(
                        symbol=sym,
                        qty=m,
                        entry_trade_id=lot.trade_id,
                        exit_trade_id=t.id,
                        entry_price=lot.price,
                        exit_price=t.price,
                        entry_time=lot.time,
                        exit_time=t.trade_time,
                        side_closed="SHORT",
                        pnl=float(pnl),
                    )
                )
                lot.qty -= m
                remaining -= m
                if lot.qty == 0:
                    shorts.pop(0)

            # Remaining opens long
            if remaining > 0:
                positions[sym]["long"].append(
                    Lot(qty=remaining, trade_id=t.id, price=t.price, fee_per_share=buy_fee_ps, time=t.trade_time)
                )

        else:  # SELL
            remaining = t.quantity
            sell_fee_ps = _fee_per_share(t.quantity, t.fees)

            # Close longs first
            longs = positions[sym]["long"]
            while remaining > 0 and longs:
                lot = longs[0]
                m = min(remaining, lot.qty)
                pnl = (t.price - lot.price) * m - (lot.fee_per_share + sell_fee_ps) * m
                realized.append(
                    RealizedMatch(
                        symbol=sym,
                        qty=m,
                        entry_trade_id=lot.trade_id,
                        exit_trade_id=t.id,
                        entry_price=lot.price,
                        exit_price=t.price,
                        entry_time=lot.time,
                        exit_time=t.trade_time,
                        side_closed="LONG",
                        pnl=float(pnl),
                    )
                )
                lot.qty -= m
                remaining -= m
                if lot.qty == 0:
                    longs.pop(0)

            # Remaining opens short
            if remaining > 0:
                positions[sym]["short"].append(
                    Lot(qty=remaining, trade_id=t.id, price=t.price, fee_per_share=sell_fee_ps, time=t.trade_time)
                )

    return realized, positions, mark


def compute_unrealized(positions: Dict[str, Dict[str, List[Lot]]], mark: Dict[str, float]) -> Dict[str, float]:
    unrealized_by_symbol: Dict[str, float] = {}
    for sym, lots in positions.items():
        px = float(mark.get(sym, 0.0))
        total = 0.0

        for lot in lots["long"]:
            # Entry fees included in cost basis (fee_per_share)
            cost = (lot.price + lot.fee_per_share) * lot.qty
            mv = px * lot.qty
            total += mv - cost

        for lot in lots["short"]:
            # Entry fees reduce proceeds: proceeds = (price - fee_ps) * qty
            proceeds = (lot.price - lot.fee_per_share) * lot.qty
            buyback = px * lot.qty
            total += proceeds - buyback

        unrealized_by_symbol[sym] = float(total)
    return unrealized_by_symbol


