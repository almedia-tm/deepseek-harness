#!/usr/bin/env bash
set -euo pipefail

PORT="${DSH_HARNESS_PORT:-3080}"
RUN_DIR="$HOME/.dsh/run"
PIDFILE="$RUN_DIR/web.pid"
LOGFILE="$RUN_DIR/web.log"
LOCKDIR="$RUN_DIR/start.lock"
URL="http://127.0.0.1:$PORT"

alive() { kill -0 "$1" 2>/dev/null; }

command -v dsh >/dev/null 2>&1 || {
  echo "start: dsh not installed; run .pinak/setup.sh first" >&2
  exit 1
}
mkdir -p "$RUN_DIR"

if [ -f "$PIDFILE" ] && alive "$(cat "$PIDFILE")"; then
  echo "dsh already running on $URL (pid $(cat "$PIDFILE"))"
  exit 0
fi
rm -f "$PIDFILE"

if mkdir "$LOCKDIR" 2>/dev/null; then
  trap 'rmdir "$LOCKDIR" 2>/dev/null || true' EXIT
elif [ -n "$(find "$LOCKDIR" -maxdepth 0 -mmin +1 2>/dev/null)" ] && rmdir "$LOCKDIR" 2>/dev/null && mkdir "$LOCKDIR" 2>/dev/null; then
  trap 'rmdir "$LOCKDIR" 2>/dev/null || true' EXIT
else
  echo "start: another start is in progress" >&2
  exit 1
fi

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "start: port $PORT is held by another process:" >&2
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >&2
  echo "start: refusing to boot; set DSH_HARNESS_PORT to a free port" >&2
  exit 1
fi

nohup dsh web --no-open --port "$PORT" >>"$LOGFILE" 2>&1 &
DSH_PID=$!
echo "$DSH_PID" >"$PIDFILE"

for _ in $(seq 1 40); do
  if ! alive "$DSH_PID"; then
    echo "start: dsh exited during boot; see $LOGFILE" >&2
    tail -n 20 "$LOGFILE" >&2
    rm -f "$PIDFILE"
    exit 1
  fi
  if curl -s -o /dev/null "$URL"; then
    TOKEN_URL="$(grep -o "http://127.0.0.1:${PORT}/[^ ]*" "$LOGFILE" | tail -1)"
    echo "dsh serving: ${TOKEN_URL:-$URL} (pid $DSH_PID, log $LOGFILE)"
    exit 0
  fi
  sleep 0.5
done

echo "start: dsh did not answer on $URL within 20s; see $LOGFILE" >&2
exit 1
