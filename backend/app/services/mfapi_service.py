from __future__ import annotations

import httpx
from typing import Dict, List, Optional
from datetime import datetime


MFAPI_BASE_URL = "https://api.mfapi.in"


async def search_mutual_funds(query: str) -> List[Dict[str, any]]:
    """
    Search for mutual funds by name or scheme code.
    Returns a list of matching schemes with normalized field names.
    API returns: [{"schemeCode": 125497, "schemeName": "..."}]
    We normalize to: [{"scheme_code": "125497", "scheme_name": "..."}]
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Search endpoint according to docs: GET /mf/search?q=HDFC
            response = await client.get(f"{MFAPI_BASE_URL}/mf/search", params={"q": query})
            if response.status_code != 200:
                print(f"Search API returned status {response.status_code}")
                return []
            
            data = response.json()
            schemes = []
            
            if isinstance(data, list):
                # API returns: [{"schemeCode": 125497, "schemeName": "..."}]
                for item in data[:50]:  # Limit to 50 results
                    if isinstance(item, dict):
                        schemes.append({
                            "scheme_code": str(item.get("schemeCode", "")),
                            "scheme_name": item.get("schemeName", ""),
                        })
            elif isinstance(data, dict) and "data" in data:
                # Handle nested data structure if present
                data_list = data["data"]
                if isinstance(data_list, list):
                    for item in data_list[:50]:
                        if isinstance(item, dict):
                            schemes.append({
                                "scheme_code": str(item.get("schemeCode", item.get("scheme_code", ""))),
                                "scheme_name": item.get("schemeName", item.get("scheme_name", "")),
                            })
            
            return schemes
    except Exception as e:
        print(f"Error searching mutual funds: {e}")
        import traceback
        traceback.print_exc()
        return []


async def get_latest_nav(scheme_code: str) -> Optional[float]:
    """
    Get the latest NAV for a given scheme code.
    According to API docs, response format is:
    {
      "meta": {...},
      "data": [{"date": "26-10-2024", "nav": "892.45600"}],
      "status": "SUCCESS"
    }
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Latest NAV endpoint: GET /mf/{scheme_code}/latest
            response = await client.get(f"{MFAPI_BASE_URL}/mf/{scheme_code}/latest")
            if response.status_code != 200:
                print(f"NAV API returned status {response.status_code} for scheme {scheme_code}")
                return None
            
            data = response.json()
            
            # According to docs, response has "data" array with latest NAV
            if isinstance(data, dict) and "data" in data:
                data_array = data["data"]
                if isinstance(data_array, list) and len(data_array) > 0:
                    latest_entry = data_array[0]
                    if isinstance(latest_entry, dict):
                        nav_str = latest_entry.get("nav")
                        if nav_str:
                            return float(nav_str)
            
            # Fallback: try direct nav field
            if isinstance(data, dict):
                nav = data.get("nav")
                if nav:
                    return float(nav)
            
            return None
    except Exception as e:
        print(f"Error fetching NAV for scheme {scheme_code}: {e}")
        import traceback
        traceback.print_exc()
        return None


async def get_historical_nav(scheme_code: str, date: Optional[datetime] = None) -> Optional[float]:
    """
    Get historical NAV for a given scheme code and date.
    If date is None, returns latest NAV.
    """
    if date is None:
        return await get_latest_nav(scheme_code)
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Get full NAV history and find the closest date
            response = await client.get(f"{MFAPI_BASE_URL}/mf/{scheme_code}")
            if response.status_code != 200:
                return None
            
            data = response.json()
            nav_history = []
            if isinstance(data, dict) and "data" in data:
                nav_history = data["data"] if isinstance(data["data"], list) else []
            elif isinstance(data, list):
                nav_history = data
            
            # Find NAV for the requested date or closest previous date
            # API returns dates in "DD-MM-YYYY" format according to docs
            target_date = date.date()
            closest_nav = None
            closest_date = None
            
            for entry in nav_history:
                if isinstance(entry, dict):
                    entry_date_str = entry.get("date")
                    nav_value = entry.get("nav")
                    if entry_date_str and nav_value:
                        try:
                            # Try DD-MM-YYYY format first (as per API docs)
                            try:
                                entry_date = datetime.strptime(entry_date_str, "%d-%m-%Y").date()
                            except ValueError:
                                # Fallback to YYYY-MM-DD format
                                try:
                                    entry_date = datetime.strptime(entry_date_str, "%Y-%m-%d").date()
                                except ValueError:
                                    continue
                            
                            if entry_date <= target_date:
                                if closest_date is None or entry_date > closest_date:
                                    closest_date = entry_date
                                    closest_nav = float(nav_value)
                        except (ValueError, TypeError) as e:
                            continue
            
            return closest_nav
    except Exception as e:
        print(f"Error fetching historical NAV for scheme {scheme_code} on {date}: {e}")
        return None


async def get_scheme_info(scheme_code: str) -> Optional[Dict[str, any]]:
    """
    Get scheme information including name, AMC, etc.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Scheme info endpoint - get from the full list or search
            response = await client.get(f"{MFAPI_BASE_URL}/mf/{scheme_code}")
            if response.status_code != 200:
                return None
            
            return response.json()
    except Exception as e:
        print(f"Error fetching scheme info for {scheme_code}: {e}")
        return None


async def get_bulk_nav(scheme_codes: List[str]) -> Dict[str, Optional[float]]:
    """
    Get latest NAV for multiple scheme codes in parallel.
    Returns a dictionary mapping scheme_code -> NAV (or None if not found).
    """
    import asyncio
    
    async def fetch_one(code: str) -> tuple[str, Optional[float]]:
        nav = await get_latest_nav(code)
        return (code, nav)
    
    tasks = [fetch_one(code) for code in scheme_codes]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    nav_dict: Dict[str, Optional[float]] = {}
    for result in results:
        if isinstance(result, Exception):
            continue
        code, nav = result
        nav_dict[code] = nav
    
    return nav_dict

