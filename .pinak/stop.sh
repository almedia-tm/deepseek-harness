#!/usr/bin/env bash
set -euo pipefail

PIDFILE="$HOME/.dsh/run/web.pid"

if [ ! -f "$PIDFILE" ]; then
  echo "stop: no pidfile; dsh is not running" >&2
  exit 1
fi
PID="$(cat "$PIDFILE")"
if ! kill -0 "$PID" 2>/dev/null; then
  rm -f "$PIDFILE"
  echo "stop: pid $PID was gone; stale pidfile removed"
  exit 0
fi

kill "$PID"
for _ in $(seq 1 20); do
  if ! kill -0 "$PID" 2>/dev/null; then
    rm -f "$PIDFILE"
    echo "stop: dsh stopped"
    exit 0
  fi
  sleep 0.5
done

echo "stop: pid $PID still alive after 10s; refusing to force kill" >&2
exit 1
