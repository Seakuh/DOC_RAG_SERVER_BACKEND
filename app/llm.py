from __future__ import annotations

from typing import List
import httpx

from .config import settings


def _build_rag_prompt(query: str, contexts: List[str]) -> str:
    ctx = "\n\n".join([f"[Kontext {i+1}]\n{c}" for i, c in enumerate(contexts)])
    return (
        "Du bist ein hilfreicher Assistent. Beantworte die Frage ausschließlich basierend auf dem Kontext.\n"
        "Wenn die Antwort nicht eindeutig im Kontext steht, sage knapp, dass die Information nicht vorhanden ist.\n\n"
        f"Kontext:\n{ctx}\n\n"
        f"Frage: {query}\n"
        "Antwort (Deutsch):"
    )


async def generate_answer(query: str, contexts: List[str]) -> str:
    # Prefer Ollama if reachable; fallback to OpenAI if API key provided
    if settings.ollama_host:
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    f"{settings.ollama_host}/api/generate",
                    json={
                        "model": settings.ollama_model,
                        "prompt": _build_rag_prompt(query, contexts),
                        "stream": False,
                        "options": {"temperature": 0.2},
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("response", "")
        except Exception:
            pass

    if settings.openai_api_key:
        from openai import AsyncOpenAI

        client = AsyncOpenAI()
        completion = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": "Du bist ein hilfreicher Assistent."},
                {
                    "role": "user",
                    "content": _build_rag_prompt(query, contexts),
                },
            ],
            temperature=0.2,
        )
        return completion.choices[0].message.content or ""

    # Last resort: return concatenated contexts, indicating missing LLM
    joined = "\n---\n".join(contexts[:3])
    return (
        "[Hinweis] Kein LLM konfiguriert (OLLAMA_HOST oder OPENAI_API_KEY).\n"
        "Top-Treffer aus Qdrant:\n" + joined
    )

