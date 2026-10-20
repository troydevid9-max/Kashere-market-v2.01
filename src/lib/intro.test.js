import test from 'node:test'
import assert from 'node:assert/strict'
import { markIntroPlayed, shouldPlayIntro } from './intro.js'

test('plays the intro on a fresh session when motion is allowed', () => {
  const storage = { getItem: () => null }

  assert.equal(shouldPlayIntro(storage, false), true)
})

test('does not replay the intro after it has played in the session', () => {
  const storage = { getItem: () => 'true' }

  assert.equal(shouldPlayIntro(storage, false), false)
})

test('skips the intro when reduced motion is preferred', () => {
  const storage = { getItem: () => null }

  assert.equal(shouldPlayIntro(storage, true), false)
})

test('remembers that the intro played for the current session', () => {
  let value = null
  const storage = {
    getItem: () => value,
    setItem: (key, nextValue) => {
      assert.equal(key, 'kashere-intro-played')
      value = nextValue
    }
  }

  markIntroPlayed(storage)

  assert.equal(shouldPlayIntro(storage, false), false)
})
