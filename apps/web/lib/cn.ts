/** Minimal className combiner — joins truthy values with a space. */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}
