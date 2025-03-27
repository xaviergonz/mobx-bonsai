/**
 * Utility type that adds a parameter to the beginning of a function's parameter list.
 *
 * This type is used to transform methods that operate on a node into methods that
 * take the node as their first parameter.
 *
 * @template F - The original function type
 * @template T - The type of the parameter to prepend
 */

export type PrependArgument<F extends (...args: any[]) => any, T> = F extends (
  ...args: infer A
) => infer R
  ? (first: T, ...args: A) => R
  : never
