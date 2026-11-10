import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { Config, apply, inject, name } from '../src/index.ts'

describe('plugin entry', () => {
  it('exports the cordis entry contract', () => {
    assert.equal(name, 'dsh-permissions')
    assert.deepEqual(inject, ['tools', 'approval', 'schedule'])
    assert.equal(typeof apply, 'function')
    assert.equal(typeof Config, 'function')
  })
})
