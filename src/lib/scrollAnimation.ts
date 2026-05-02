const DEFAULT_SCROLL_DURATION_MS = 1000

let activeRafId: number | null = null

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function prefersReducedMotion(): boolean {
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function cancelScrollAnimation() {
  if (activeRafId !== null) {
    cancelAnimationFrame(activeRafId)
    activeRafId = null
  }
}

export function animateScrollToY(
  targetY: number,
  options?: { durationMs?: number },
) {
  cancelScrollAnimation()

  const durationMs = options?.durationMs ?? DEFAULT_SCROLL_DURATION_MS
  const normalizedTargetY = Math.max(0, Math.round(targetY))

  if (prefersReducedMotion()) {
    window.scrollTo(0, normalizedTargetY)
    return
  }

  const startY = window.scrollY
  if (startY === normalizedTargetY) {
    window.scrollTo(0, normalizedTargetY)
    return
  }

  let startTimestamp: number | null = null
  const step = (timestamp: number) => {
    if (startTimestamp === null) startTimestamp = timestamp

    const elapsed = timestamp - startTimestamp
    const progress = Math.min(elapsed / durationMs, 1)
    const eased = easeOutCubic(progress)
    const nextY = Math.round(startY + (normalizedTargetY - startY) * eased)

    window.scrollTo(0, nextY)

    if (progress < 1) {
      activeRafId = requestAnimationFrame(step)
      return
    }

    activeRafId = null
  }

  activeRafId = requestAnimationFrame(step)
}
