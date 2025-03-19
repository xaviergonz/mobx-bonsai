/**
 * A function for disposing resources.
 */
export type Dispose<A extends any[] = []> = (...args: A) => void

/**
 * Wraps a function to ensure it is only executed once.
 *
 * @param fn - The function to be executed only once.
 * @returns A new function that calls the original function only the first time it is invoked.
 */
export function disposeOnce<A extends any[]>(fn: (...args: A) => void): Dispose<A> {
  let disposed = false

  return (...args: A) => {
    if (disposed) {
      return
    }
    disposed = true

    fn(...args)
  }
}
