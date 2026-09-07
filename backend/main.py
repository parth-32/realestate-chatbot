"""
FastAPI Server for Real Estate AI Concierge (DarGlobal & Wasalt).
Exposes REST and SSE Streaming endpoints for real estate search, RAG, and chat.
"""

import os
import json
import asyncio
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Query, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Ensure .env is loaded
_base_dir = Path(__file__).resolve().parent
_env_candidates = [_base_dir / ".env", _base_dir.parent / ".env"]
for env_file in _env_candidates:
    if env_file.exists():
        load_dotenv(dotenv_path=env_file, override=False)
        break
else:
    load_dotenv()

from rag_engine import RAGEngine
from openrouter_client import OpenRouterClient, FREE_MODELS, DEFAULT_MODEL
from scraper import build_catalog

app = FastAPI(
    title="Real Estate AI Concierge API",
    description="Intelligent RAG discovery backend for DarGlobal & Wasalt luxury real estate",
    version="1.0.0"
)

# Enable CORS for Next.js development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag_engine = RAGEngine()
openrouter_client = OpenRouterClient()

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = DEFAULT_MODEL
    api_key: Optional[str] = None
    stream: Optional[bool] = True

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Real Estate AI Backend",
        "indexed_properties": len(rag_engine.properties),
        "available_models": FREE_MODELS,
        "default_model": DEFAULT_MODEL
    }

@app.get("/api/stats")
def get_stats():
    props = rag_engine.properties
    darglobal_count = sum(1 for p in props if p.get("source") == "DarGlobal")
    wasalt_count = sum(1 for p in props if p.get("source") == "Wasalt")
    
    cities = list(set(p.get("city") for p in props if p.get("city")))
    brands = list(set(p.get("luxury_brand") for p in props if p.get("luxury_brand") and p.get("source") == "DarGlobal"))
    
    prices = [p.get("price_sar", 0) for p in props if p.get("price_sar", 0) > 0]
    min_price = min(prices) if prices else 0
    max_price = max(prices) if prices else 0
    avg_price = round(sum(prices) / len(prices)) if prices else 0

    return {
        "total_properties": len(props),
        "darglobal_projects": darglobal_count,
        "wasalt_listings": wasalt_count,
        "cities_covered": sorted(cities),
        "branded_partnerships": sorted(brands),
        "pricing_sar": {
            "min": min_price,
            "max": max_price,
            "avg": avg_price
        }
    }

@app.get("/api/properties")
def list_properties(
    source: Optional[str] = None,
    city: Optional[str] = None,
    property_type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_beds: Optional[int] = None,
    brand: Optional[str] = None,
    query: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50)
):
    if query:
        results = rag_engine.retrieve(query, top_k=50)
        # Apply secondary filters if present
        if source:
            results = [p for p in results if p.get("source", "").lower() == source.lower()]
        if city:
            results = [p for p in results if city.lower() in p.get("city", "").lower()]
        if property_type:
            results = [p for p in results if property_type.lower() in p.get("property_type", "").lower()]
    else:
        results = rag_engine.filter_properties(
            source=source,
            city=city,
            property_type=property_type,
            min_price=min_price,
            max_price=max_price,
            min_beds=min_beds,
            luxury_brand=brand
        )

    total = len(results)
    start = (page - 1) * page_size
    end = start + page_size
    items = results[start:end]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 0,
        "properties": items
    }

@app.get("/api/properties/{prop_id}")
def get_property(prop_id: str):
    for p in rag_engine.properties:
        if p.get("id") == prop_id:
            return p
    raise HTTPException(status_code=404, detail="Property not found")

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="Messages cannot be empty")

    user_query = ""
    for m in reversed(request.messages):
        if m.role == "user":
            user_query = m.content
            break

    # RAG Retrieval
    matched_properties = rag_engine.retrieve(user_query, top_k=4)
    system_prompt = rag_engine.build_system_prompt(matched_properties)
    fallback_text = rag_engine.generate_fallback_response(user_query, matched_properties)

    # Prepare LLM conversation
    llm_messages = [{"role": "system", "content": system_prompt}]
    for m in request.messages[-6:]:  # keep last 6 turns
        llm_messages.append({"role": m.role, "content": m.content})

    async def event_generator():
        # First event: Send recommended properties metadata as structured JSON
        cards_data = [
            {
                "id": p["id"],
                "source": p["source"],
                "title": p["title"],
                "city": p["city"],
                "country": p["country"],
                "price_formatted": p["price_formatted"],
                "price_sar": p["price_sar"],
                "bedrooms": p["bedrooms"],
                "area_sqm": p["area_sqm"],
                "hero_image": p["hero_image"],
                "url": p["url"],
                "luxury_brand": p["luxury_brand"]
            }
            for p in matched_properties
        ]
        meta_event = json.dumps({"type": "meta", "properties": cards_data})
        yield f"data: {meta_event}\n\n"

        # Stream LLM tokens
        async for chunk in openrouter_client.stream_chat(
            messages=llm_messages,
            model=request.model or DEFAULT_MODEL,
            api_key=request.api_key,
            fallback_text=fallback_text
        ):
            yield chunk

        yield "data: [DONE]\n\n"

    if request.stream:
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    else:
        # Non-streaming response fallback
        return {
            "response": fallback_text,
            "properties": matched_properties,
            "model": request.model
        }

@app.post("/api/scrape/refresh")
def refresh_catalog():
    combined = build_catalog()
    rag_engine.load_data()
    return {"status": "success", "count": len(combined)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
