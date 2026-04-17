# backend/app/services/claude.py
import os
import json
import anthropic
from fastapi import HTTPException

_client: anthropic.Anthropic | None = None

SCENE_PROMPT = """Generate {count} natural English dialogues for the scene: "{scene}".
Return ONLY a JSON array, no markdown, no explanation.
Each item: {{"english": "...", "chinese": "...（中文翻译）"}}
Make dialogues practical and natural."""

def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise HTTPException(status_code=503, detail="Claude API not configured")
        _client = anthropic.Anthropic(api_key=api_key)
    return _client

def generate_scene_dialogues(scene_name: str, count: int = 10) -> list[dict]:
    try:
        message = _get_client().messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            messages=[{"role": "user", "content": SCENE_PROMPT.format(scene=scene_name, count=count)}],
        )
        text = message.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        result = json.loads(text.strip())
        if not isinstance(result, list):
            raise ValueError(f"Expected list, got {type(result).__name__}")
        return result
    except (anthropic.APIError, anthropic.APIConnectionError) as e:
        raise HTTPException(status_code=502, detail=f"Claude API error: {e}")
    except (json.JSONDecodeError, ValueError, IndexError) as e:
        raise HTTPException(status_code=502, detail=f"Claude returned unexpected response: {e}")
