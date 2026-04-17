# backend/app/services/parser.py
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse

MAX_BYTES = 2 * 1024 * 1024  # 2 MB


def parse_url(url: str) -> tuple[str, str]:
    """Returns (title, clean_text)."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"Unsupported URL scheme: {parsed.scheme}")
    hostname = parsed.hostname or ""
    blocked = {"localhost", "127.0.0.1", "0.0.0.0", "::1", ""}
    if hostname in blocked or hostname.startswith("169.254.") or hostname.startswith("10.") or hostname.startswith("192.168.") or hostname.startswith("172."):
        raise ValueError("Private/internal URLs are not allowed")

    resp = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"}, stream=True)
    resp.raise_for_status()
    content_bytes = b""
    for chunk in resp.iter_content(chunk_size=65536):
        content_bytes += chunk
        if len(content_bytes) > MAX_BYTES:
            break
    soup = BeautifulSoup(content_bytes.decode(resp.encoding or "utf-8", errors="replace"), "html.parser")
    title_str = soup.title.get_text(separator=" ").strip() if soup.title else ""
    title = title_str or url
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    text = soup.get_text(separator=" ")
    text = re.sub(r"\s+", " ", text).strip()
    return title, text


def count_words(text: str) -> int:
    return len(re.findall(r"\b[a-zA-Z]+\b", text))


def estimate_unknown(text: str, known_words: set[str]) -> int:
    words = set(re.findall(r"\b[a-zA-Z]+\b", text.lower()))
    return len(words - known_words)
