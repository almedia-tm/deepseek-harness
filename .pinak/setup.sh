#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIN="$(cat "$DIR/.dsh-version")"
MIN_NODE="24.9.0"

command -v node >/dev/null 2>&1 || {
  echo "setup: node not found; dsh requires node >= $MIN_NODE" >&2
  exit 1
}
if ! node -e 'const [a, b] = process.versions.node.split(".").map(Number); process.exit(a > 24 || (a === 24 && b >= 9) ? 0 : 1)'; then
  echo "setup: node $(node -p 'process.versions.node') is below the dsh engine requirement $MIN_NODE" >&2
  exit 1
fi

if command -v dsh >/dev/null 2>&1 && [ "$(dsh --version)" = "$PIN" ]; then
  echo "setup: dsh $PIN already installed"
else
  echo "setup: installing @deepseek-ai/dsh@$PIN"
  npm install -g --allow-scripts=@deepseek-ai/dsh-subprocess-local,koffi,node-pty,@google/genai,protobufjs "@deepseek-ai/dsh@$PIN"
fi

PLUGINS_DIR="$(cd "$DIR/.." && pwd)/plugins"
if [ -d "$PLUGINS_DIR" ]; then
  for plugin in "$PLUGINS_DIR"/*/; do
    [ -e "${plugin}package.json" ] || continue
    echo "setup: installing plugin ${plugin%/}"
    dsh plugin --profile web add "${plugin%/}"
  done
fi

mkdir -p "$HOME/.local/bin"
ln -sf "$DIR/dsh-harness" "$HOME/.local/bin/dsh-harness"
case ":$PATH:" in
  *":$HOME/.local/bin:"*) ;;
  *) echo "setup: $HOME/.local/bin is not on PATH; add it or call $DIR/dsh-harness directly" >&2 ;;
esac

echo "setup: done"
