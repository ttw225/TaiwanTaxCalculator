// All accessors are SSR-safe: during prerender / SSR there is no `window`,
// so the read returns null and writes are no-ops. Real reads happen in
// `useEffect` after hydration to avoid hydration mismatch.

function hasLocalStorage(): boolean {
  // The `window.localStorage` getter itself can throw in restrictive
  // contexts (sandboxed iframes, blocked storage permissions, Safari
  // private mode in older versions). Wrap the access in try/catch.
  if (typeof window === 'undefined') return false
  try {
    return typeof window.localStorage !== 'undefined'
  } catch {
    return false
  }
}

export function readLocal<T>(key: string): T | null {
  if (!hasLocalStorage()) return null
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function writeLocal<T>(key: string, value: T): void {
  if (!hasLocalStorage()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // localStorage unavailable (private browsing, iframe restrictions)
  }
}

export function removeLocal(key: string): void {
  if (!hasLocalStorage()) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // localStorage unavailable
  }
}

export function hasLocalKey(key: string): boolean {
  if (!hasLocalStorage()) return false
  try {
    return window.localStorage.getItem(key) !== null
  } catch {
    return false
  }
}
