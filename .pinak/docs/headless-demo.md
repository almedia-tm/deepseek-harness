# Headless guard demo

Proves the dsh-permissions plugin live: the deny guard refuses before execution, the ask tier rejects deterministically under the headless approval policy. The key is injected one-shot from the macOS keychain (service `dsh-deepseek-api-key`, account `pinak`); it never lands in a shell variable, an export, or shell history.

## Deny class

```sh
DEEPSEEK_API_KEY=$(security find-generic-password -s dsh-deepseek-api-key -a pinak -w) \
  dsh --profile headless 'run the command `git commit -m demo` and report what happened'
```

Expected: the bash call is refused before anything runs, the session output carries `denied by dsh-permissions: git commit is a user action`.

## Ask class

```sh
DEEPSEEK_API_KEY=$(security find-generic-password -s dsh-deepseek-api-key -a pinak -w) \
  dsh --profile headless 'run the command `rm -f /tmp/dsh-demo.txt` and report what happened'
```

Expected: the bash call reaches the ask tier; the headless approval policy rejects it deterministically and the refusal lands in the run output. The file is never touched.
