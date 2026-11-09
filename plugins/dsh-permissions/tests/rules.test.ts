import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { classifyAsk, classifyDeny, validateClasses, ASK_CLASSES, DENY_CLASSES } from '../src/guards'

describe('classifyDeny', () => {
  it('denies secret file reads', () => {
    assert.equal(classifyDeny('bash', 'cat ~/.ssh/id_rsa')?.class, 'secret-read')
    assert.equal(classifyDeny('bash', 'grep TOKEN .env')?.class, 'secret-read')
    assert.equal(classifyDeny('bash', 'tail -f /etc/credentials')?.class, 'secret-read')
    assert.equal(classifyDeny('bash', 'cat README.md'), undefined)
  })

  it('strips sudo and doas before matching', () => {
    assert.equal(classifyDeny('bash', 'sudo cat .env')?.class, 'secret-read')
    assert.equal(classifyDeny('bash', 'sudo -u root cat ~/.ssh/id_rsa')?.class, 'secret-read')
  })

  it('denies environment dumps but not lookalikes', () => {
    assert.equal(classifyDeny('bash', 'env')?.class, 'env-dump')
    assert.equal(classifyDeny('bash', 'printenv')?.class, 'env-dump')
    assert.equal(classifyDeny('bash', 'envsubst vars.txt'), undefined)
  })

  it('denies git commit but not other git reads', () => {
    assert.equal(classifyDeny('bash', 'git commit -m x')?.class, 'git-commit')
    assert.equal(classifyDeny('bash', 'git status'), undefined)
    assert.equal(classifyDeny('bash', 'git log'), undefined)
  })

  it('denies gcloud secrets and railway variables', () => {
    assert.equal(classifyDeny('bash', 'gcloud secrets versions access mysecret')?.class, 'gcloud-secrets')
    assert.equal(classifyDeny('bash', 'railway variables')?.class, 'railway-variables')
    assert.equal(classifyDeny('bash', 'railway up'), undefined)
  })

  it('denies writes to .env files but not other redirects', () => {
    assert.equal(classifyDeny('bash', 'echo KEY=1 >> .env')?.class, 'env-file-write')
    assert.equal(classifyDeny('bash', 'sed -i s/a/b/ .env')?.class, 'env-file-write')
    assert.equal(classifyDeny('bash', 'echo hi > out.txt'), undefined)
  })

  it('denies the Artifact tool by name', () => {
    assert.equal(classifyDeny('Artifact', '')?.class, 'artifact')
    assert.equal(classifyDeny('bash', 'touch file'), undefined)
  })

  it('treats empty and non-bash commands as no match', () => {
    assert.equal(classifyDeny('bash', '   '), undefined)
    assert.equal(classifyDeny('Read', 'anything'), undefined)
  })
})

describe('classifyAsk', () => {
  it('asks on deploys and publishes', () => {
    assert.equal(classifyAsk('bash', 'gcloud run deploy app')?.class, 'deploy')
    assert.equal(classifyAsk('bash', 'npm publish')?.class, 'deploy')
    assert.equal(classifyAsk('bash', 'git push origin main')?.class, 'deploy')
    assert.equal(classifyAsk('bash', 'railway up')?.class, 'deploy')
  })

  it('asks on git state changers', () => {
    assert.equal(classifyAsk('bash', 'git checkout main')?.class, 'git-state')
    assert.equal(classifyAsk('bash', 'git rebase -i HEAD~2')?.class, 'git-state')
    assert.equal(classifyAsk('bash', 'git status'), undefined)
  })

  it('asks on rm, docker, kubectl, terraform', () => {
    assert.equal(classifyAsk('bash', 'rm -rf node_modules')?.class, 'rm')
    assert.equal(classifyAsk('bash', 'docker push img')?.class, 'docker')
    assert.equal(classifyAsk('bash', 'kubectl apply -f svc.yaml')?.class, 'kubectl')
    assert.equal(classifyAsk('bash', 'terraform apply')?.class, 'terraform')
    assert.equal(classifyAsk('bash', 'terraform plan')?.class, 'terraform')
    assert.equal(classifyAsk('bash', 'terraform output'), undefined)
  })

  it('asks on MCP write tools by name, never on read tools', () => {
    assert.equal(classifyAsk('mcp__linear__save_issue', '')?.class, 'mcp-write')
    assert.equal(classifyAsk('mcp__slack__conversations_add_message', '')?.class, 'mcp-write')
    assert.equal(classifyAsk('mcp__linear__list_issues', ''), undefined)
  })

  it('does not ask for non-bash tools', () => {
    assert.equal(classifyAsk('Read', 'file'), undefined)
  })
})

describe('validateClasses', () => {
  it('accepts the full defaults', () => {
    validateClasses([...DENY_CLASSES], [...ASK_CLASSES])
  })

  it('throws on unknown class names', () => {
    assert.throws(() => validateClasses(['not-a-class'], []), /unknown class/)
  })

  it('throws when both lists are empty', () => {
    assert.throws(() => validateClasses([], []), /refusing to boot/)
  })
})
