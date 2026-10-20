const INTRO_SESSION_KEY = 'kashere-intro-played'

export function shouldPlayIntro(storage, prefersReducedMotion) {
  return !prefersReducedMotion && storage.getItem(INTRO_SESSION_KEY) !== 'true'
}

export function markIntroPlayed(storage) {
  storage.setItem(INTRO_SESSION_KEY, 'true')
}
