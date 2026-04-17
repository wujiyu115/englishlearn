#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
VENV_DIR="$BACKEND_DIR/.venv"

# ── 杀掉旧进程 ─────────────────────────────────────────────────────
kill_port() {
  local pid
  pid=$(lsof -ti tcp:"$1" 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "[cleanup] Killing process on port $1 (pid $pid)..."
    kill -9 $pid 2>/dev/null || true
  fi
}
kill_port 8000
kill_port 3000

# ── Backend: uv 虚拟环境 ────────────────────────────────────────────
if ! command -v uv &>/dev/null; then
  echo "[error] uv not found. Install: curl -Ls https://astral.sh/uv/install.sh | sh"
  exit 1
fi

if [ ! -d "$VENV_DIR" ]; then
  echo "[backend] Creating virtual environment with uv..."
  uv venv "$VENV_DIR"
fi

echo "[backend] Installing dependencies..."
uv pip install --python "$VENV_DIR/bin/python" -r "$BACKEND_DIR/requirements.txt" -q

echo "[backend] Starting FastAPI (port 8000)..."
"$VENV_DIR/bin/uvicorn" app.main:app --reload --app-dir "$BACKEND_DIR" --port 8000 &
BACKEND_PID=$!

# ── Frontend: bun ───────────────────────────────────────────────────
if ! command -v bun &>/dev/null; then
  echo "[error] bun not found. Install: curl -fsSL https://bun.sh/install | bash"
  kill $BACKEND_PID
  exit 1
fi

echo "[frontend] Installing dependencies..."
bun install --cwd "$FRONTEND_DIR"

echo "[frontend] Starting rsbuild dev server (port 3000)..."
bun run --cwd "$FRONTEND_DIR" dev &
FRONTEND_PID=$!

# ── 退出时清理子进程 ────────────────────────────────────────────────
trap "echo ''; echo '[stop] Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" INT TERM

echo ""
echo "  Backend  → http://localhost:8000"
echo "  Frontend → http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop."
wait
