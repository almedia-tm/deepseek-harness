# .pinak

Local harness tooling, tracked on the pinak-plugins branch. The upstream repo's own scripts/ and docs/ stay untouched.

## Files

| File | Purpose |
|---|---|
| `.dsh-version` | Pinned dsh version, single source of truth |
| `setup.sh` | Installs the pinned dsh globally, installs plugins from plugins/ into the web profile, links the dsh-harness command into ~/.local/bin |
| `start.sh` | Idempotent start: no-op when already running, boots dsh web on 127.0.0.1:3080, never kills a foreign process on the port |
| `stop.sh` | Stops by pidfile only, refuses to force kill |
| `dsh-harness` | Dispatcher: `dsh-harness start|stop` |
| `docs/` | Spike seam notes, pin record, plugin design |

## Usage

```sh
.pinak/setup.sh
dsh-harness start
dsh-harness stop
```

Port override: `DSH_HARNESS_PORT=3300 dsh-harness start`. Runtime state lives in ~/.dsh/run (pidfile, lock, log).
