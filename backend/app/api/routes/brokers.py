from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.auth.dependencies import get_current_user
from app.integrations.brokers import dhan as dhan_client
from app.integrations.brokers import upstox as upstox_client
from app.integrations.brokers import zerodha as zerodha_client
from app.models.brokers import BrokerConnectRequest, BrokerImportRequest
from app.services.broker_connections import delete_connection, get_connection_credentials, list_connections, upsert_connection
from app.services.trade_ingest import ingest_trades

router = APIRouter(prefix="/brokers", tags=["brokers"])


@router.get("")
def supported() -> dict:
    return {
        "supported": ["zerodha", "upstox", "dhan"],
        "notes": {
            "read_only": True,
            "no_order_placement": True,
            "no_investment_advice": True,
        },
    }


@router.get("/connections")
def connections(user: dict = Depends(get_current_user)) -> dict:
    return {"connections": list_connections(user_id=str(user["id"]))}


@router.post("/{broker}/connect")
def connect(broker: str, payload: BrokerConnectRequest, user: dict = Depends(get_current_user)) -> dict:
    broker = broker.strip().lower()
    if broker not in {"zerodha", "upstox", "dhan"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported broker")

    if broker == "zerodha" and not payload.api_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="api_key is required for zerodha")

    record = upsert_connection(
        user_id=str(user["id"]),
        broker=broker,
        credentials={"api_key": payload.api_key, "access_token": payload.access_token, "client_id": payload.client_id},
    )
    return {"connection": record, "notes": {"encrypted_at_rest": True, "read_only": True}}


@router.delete("/{broker}/disconnect", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def disconnect(broker: str, user: dict = Depends(get_current_user)) -> Response:
    broker = broker.strip().lower()
    delete_connection(user_id=str(user["id"]), broker=broker)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{broker}/import")
def import_from_broker(broker: str, payload: BrokerImportRequest, user: dict = Depends(get_current_user)) -> dict:
    broker = broker.strip().lower()

    try:
        if broker == "zerodha":
            if not payload.api_key:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="api_key is required for zerodha")
            fetched = zerodha_client.fetch_trades(api_key=payload.api_key, access_token=payload.access_token)
        elif broker == "upstox":
            fetched = upstox_client.fetch_trades(access_token=payload.access_token)
        elif broker == "dhan":
            fetched = dhan_client.fetch_trades(access_token=payload.access_token, client_id=payload.client_id)
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported broker")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Broker fetch failed: {e}")

    # Optional date filtering (best-effort; depends on broker payload granularity)
    if payload.from_date:
        fetched = [t for t in fetched if t.trade_time.date() >= payload.from_date]
    if payload.to_date:
        fetched = [t for t in fetched if t.trade_time.date() <= payload.to_date]

    normalized = [
        {
            "symbol": t.symbol,
            "side": t.side,
            "quantity": t.quantity,
            "price": t.price,
            "trade_time": t.trade_time,
            "fees": t.fees,
        }
        for t in fetched
    ]

    summary = ingest_trades(user_id=str(user["id"]), trades=normalized)
    summary["broker"] = broker
    summary["notes"] = {
        "read_only": True,
        "no_order_placement": True,
        "no_investment_advice": True,
        "date_filtering": "applied_server_side",
    }
    return summary


@router.post("/{broker}/sync")
def sync_from_saved_connection(broker: str, user: dict = Depends(get_current_user)) -> dict:
    broker = broker.strip().lower()
    creds = get_connection_credentials(user_id=str(user["id"]), broker=broker)
    if not creds:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No connection found for broker")

    payload = BrokerImportRequest(
        api_key=creds.get("api_key"),
        access_token=creds.get("access_token") or "",
        client_id=creds.get("client_id"),
        from_date=None,
        to_date=None,
    )
    return import_from_broker(broker=broker, payload=payload, user=user)


