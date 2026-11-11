/** Keep editing text separate from numeric values consumed by forms. */
export function isCompleteNumber(text: string): boolean {
  return text.trim() !== "" && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text.trim()) && Number.isFinite(Number(text));
}

export function matchesNumericValue(text: string, value: unknown): boolean {
  if (text === "") return value === "" || value == null || value === 0;
  return isCompleteNumber(text) && Number(text) === Number(value);
}