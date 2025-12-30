from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional

from app.services.mfapi_service import get_bulk_nav


@dataclass
class MutualFundRow:
    id: str
    user_id: str
    scheme_code: str
    scheme_name: str
    units: float
    nav: float  # NAV at purchase time
    investment_date: datetime
    fees: float


@dataclass
class MutualFundPosition:
    scheme_code: str
    scheme_name: str
    total_units: float
    total_investment: float  # Total amount invested (including fees)
    avg_nav: float  # Average NAV (weighted by units)
    current_nav: Optional[float]  # Latest NAV from API
    current_value: float  # current_nav * total_units
    unrealized_pnl: float  # current_value - total_investment
    first_investment_date: datetime
    last_investment_date: datetime


def compute_mf_positions(
    investments: List[MutualFundRow],
    current_navs: Optional[Dict[str, float]] = None,
) -> Dict[str, MutualFundPosition]:
    """
    Compute mutual fund positions by aggregating investments by scheme_code.
    Returns a dictionary mapping scheme_code -> MutualFundPosition.
    """
    positions: Dict[str, MutualFundPosition] = {}
    current_navs = current_navs or {}
    
    for inv in investments:
        code = inv.scheme_code
        investment_amount = (inv.nav * inv.units) + inv.fees
        
        if code not in positions:
            positions[code] = MutualFundPosition(
                scheme_code=code,
                scheme_name=inv.scheme_name,
                total_units=0.0,
                total_investment=0.0,
                avg_nav=0.0,
                current_nav=current_navs.get(code),
                current_value=0.0,
                unrealized_pnl=0.0,
                first_investment_date=inv.investment_date,
                last_investment_date=inv.investment_date,
            )
        
        pos = positions[code]
        pos.total_units += inv.units
        pos.total_investment += investment_amount
        pos.avg_nav = pos.total_investment / pos.total_units if pos.total_units > 0 else 0.0
        
        if inv.investment_date < pos.first_investment_date:
            pos.first_investment_date = inv.investment_date
        if inv.investment_date > pos.last_investment_date:
            pos.last_investment_date = inv.investment_date
    
    # Calculate current value and unrealized PnL
    for pos in positions.values():
        if pos.current_nav is not None and pos.current_nav > 0:
            pos.current_value = pos.current_nav * pos.total_units
            pos.unrealized_pnl = pos.current_value - pos.total_investment
        else:
            # If NAV not available, use average NAV as fallback
            pos.current_value = pos.avg_nav * pos.total_units
            pos.unrealized_pnl = 0.0
    
    return positions


async def compute_mf_positions_with_nav(
    investments: List[MutualFundRow],
) -> Dict[str, MutualFundPosition]:
    """
    Compute mutual fund positions and fetch latest NAVs from MFapi.in.
    """
    if not investments:
        return {}
    
    # Get unique scheme codes
    scheme_codes = list(set(inv.scheme_code for inv in investments))
    
    # Fetch latest NAVs in parallel
    current_navs = await get_bulk_nav(scheme_codes)
    
    return compute_mf_positions(investments, current_navs)

