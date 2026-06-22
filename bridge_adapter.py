"""
PETER AI v4.0 Bridge Adapter
Accepts requests from Railway Gateway with user context
Forwards to local core, adds multi-tenant isolation via session namespacing
"""

from fastapi import FastAPI, Header, HTTPException, BackgroundTasks
import httpx
import json
from typing import Optional, Dict, Any
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import uuid
from datetime import datetime, timezone

load_dotenv()

CORE_URL = os.getenv("CORE_URL", "http://localhost:8001")
app = FastAPI(title="PETER AI Bridge Adapter")

# ========== MIDDLEWARE: EXTRACT AUTH ==========

async def verify_auth(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    x_tenant_id: Optional[str] = Header(None),
) -> Dict[str, str]:
    """Extract user context from Railway request headers"""
    if not authorization:
        raise HTTPException(401, "Missing Authorization header")
    if not x_user_id:
        raise HTTPException(400, "Missing X-User-Id header")
    
    return {
        "user_id": x_user_id,
        "tenant_id": x_tenant_id or "default",
        "api_key": authorization.replace("Bearer ", ""),
    }

# ========== CORE ENDPOINTS ==========

@app.post("/v1/chat")
async def bridge_chat(
    request_body: Dict[str, Any],
    background_tasks: BackgroundTasks,
    authorization: str = Header(None),
    x_user_id: str = Header(None),
    x_tenant_id: Optional[str] = Header(None),
):
    """Proxy chat endpoint with user isolation"""
    auth = await verify_auth(authorization, x_user_id, x_tenant_id)
    
    # Namespace session by user
    session_id = request_body.get("session_id", uuid.uuid4().hex[:12])
    namespaced_session = f"{auth['user_id']}::{session_id}"
    
    # Forward to core
    payload = {
        **request_body,
        "session_id": namespaced_session,
    }
    
    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            f"{CORE_URL}/api/chat",
            json=payload,
        )
    
    result = response.json()
    
    # Log usage in background
    background_tasks.add_task(
        log_usage,
        user_id=auth["user_id"],
        endpoint="/chat",
        tokens=result.get("tokens_used", 0),
    )
    
    return result

@app.post("/v1/script/generate")
async def bridge_script_gen(
    request_body: Dict[str, Any],
    authorization: str = Header(None),
    x_user_id: str = Header(None),
    x_tenant_id: Optional[str] = Header(None),
):
    """Proxy script generation endpoint"""
    auth = await verify_auth(authorization, x_user_id, x_tenant_id)
    
    payload = {
        **request_body,
        "_user_id": auth["user_id"],  # For optional server.py filtering
    }
    
    async with httpx.AsyncClient(timeout=300) as client:
        response = await client.post(
            f"{CORE_URL}/api/script/generate",
            json=payload,
        )
    
    return response.json()

@app.get("/health")
async def health():
    """Health check"""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.get(f"{CORE_URL}/api/")
        return {"status": "healthy", "core": "ok"}
    except Exception as e:
        return {"status": "degraded", "core": "error", "error": str(e)}

async def log_usage(user_id: str, endpoint: str, tokens: int):
    """Log usage for billing"""
    # TODO: Send to Railway Gateway for billing
    print(f"[USAGE] {user_id} {endpoint} {tokens} tokens")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)
