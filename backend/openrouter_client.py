"""
OpenRouter Client with Streaming and Multi-Model Free Tier Fallback.
Provides unified SSE streaming with robust failover to local RAG engine.
"""

import os
import json
import asyncio
from pathlib import Path
import httpx
from typing import AsyncGenerator, List, Dict, Any, Optional
from dotenv import load_dotenv

# Search and load .env from current dir or parent project root
_base_dir = Path(__file__).resolve().parent
_env_candidates = [_base_dir / ".env", _base_dir.parent / ".env"]
for env_file in _env_candidates:
    if env_file.exists():
        load_dotenv(dotenv_path=env_file, override=False)
        break
else:
    load_dotenv()

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

FREE_MODELS = [
    "minimax/minimax-m3:free",
    "nvidia/nemotron-3.5-lightning:free",
    "minimax/minimax-m2.7:free",
    "liquid/lfm-2.5-2.6b:free",
    "dots-studio/dots-3-note-preview:free"
]

DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "minimax/minimax-m3:free")

class OpenRouterClient:
    def __init__(self, default_key: Optional[str] = None):
        self.env_key = default_key or os.getenv("OPENROUTER_API_KEY", "")

    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        model: str = DEFAULT_MODEL,
        api_key: Optional[str] = None,
        fallback_text: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Streams completions from OpenRouter via SSE.
        Yields JSON-encoded SSE events:
          data: {"token": "...", "model": "..."}
          data: [DONE]
        """
        active_key = (api_key or os.getenv("OPENROUTER_API_KEY", "") or self.env_key).strip()

        # If no key provided, or if user requests simulated fast fallback
        if not active_key or active_key == "demo_mode":
            print("[OpenRouter] No active API key provided, streaming deterministic RAG response.")
            for chunk in self._stream_fallback(fallback_text or "No matching properties found.", model="local-rag-concierge"):
                yield chunk
            return

        headers = {
            "Authorization": f"Bearer {active_key}",
            "HTTP-Referer": "https://darglobal-wasalt-concierge.ai",
            "X-Title": "DarGlobal & Wasalt Real Estate Concierge",
            "Content-Type": "application/json"
        }

        primary_model = model
        # Select secondary backup free model if primary experiences rate-limiting
        backup_model = "nvidia/nemotron-3.5-lightning:free" if "minimax" in primary_model else "minimax/minimax-m3:free"
        models_to_try = [primary_model]
        if backup_model not in models_to_try:
            models_to_try.append(backup_model)

        success = False
        tokens_emitted = 0

        for current_model in models_to_try:
            payload = {
                "model": current_model,
                "messages": messages,
                "stream": True,
                "temperature": 0.3,
                "max_tokens": 1024
            }

            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    async with client.stream("POST", OPENROUTER_URL, headers=headers, json=payload) as response:
                        if response.status_code == 200:
                            async for line in response.aiter_lines():
                                if not line:
                                    continue
                                if line.startswith("data: "):
                                    data_str = line[6:].strip()
                                    if data_str == "[DONE]":
                                        success = True
                                        yield "data: [DONE]\n\n"
                                        break
                                    try:
                                        data_json = json.loads(data_str)
                                        delta = data_json.get("choices", [{}])[0].get("delta", {})
                                        content = delta.get("content", "")
                                        if content:
                                            tokens_emitted += 1
                                            msg = json.dumps({"token": content, "model": current_model})
                                            yield f"data: {msg}\n\n"
                                    except Exception:
                                        continue
                            if tokens_emitted > 0:
                                success = True
                                break
                        else:
                            resp_body = await response.aread()
                            print(f"[OpenRouter] {current_model} returned {response.status_code}: {resp_body.decode('utf-8', errors='ignore')}")
            except Exception as e:
                print(f"[OpenRouter] {current_model} request failed: {e}")

            if success or tokens_emitted > 0:
                break
            print(f"[OpenRouter] Retrying with backup model: {backup_model}")

        if not success and tokens_emitted == 0:
            print("[OpenRouter] Stream failed or rate-limited; falling back to local RAG concierge.")
            for chunk in self._stream_fallback(
                fallback_text or "I apologize for the delay. Here are the curated property recommendations from DarGlobal and Wasalt based on your search.",
                model="local-rag-fallback"
            ):
                yield chunk

    def _stream_fallback(self, text: str, model: str):
        """Simulates smooth word-by-word streaming for fallback."""
        words = text.split(" ")
        for i, word in enumerate(words):
            chunk = word + (" " if i < len(words) - 1 else "")
            yield f"data: {json.dumps({'token': chunk, 'model': model})}\n\n"
