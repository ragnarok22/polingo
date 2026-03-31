/**
 * Interpolates variables within a string.
 *
 * Supports placeholders such as {name}, {count}, etc.
 *
 * @example
 * interpolate('Hello, {name}!', { name: 'Juan' }) // "Hello, Juan!"
 * interpolate('You have {n} items', { n: 5 }) // "You have 5 items"
 * interpolate('No variables') // "No variables"
 * interpolate('Missing {var}') // "Missing {var}"
 *
 * @param text - Text containing placeholders to replace
 * @param vars - Object with values to inject into the placeholders
 * @returns Text with interpolated variables
 */
export function interpolate(text: string, vars?: Record<string, string | number>): string {
  // If no variables are provided, return the original text.
  if (!vars || Object.keys(vars).length === 0) {
    return text;
  }

  const firstOpeningBrace = text.indexOf('{');
  if (firstOpeningBrace === -1) {
    return text;
  }

  let result = '';
  let cursor = 0;

  while (cursor < text.length) {
    const openingBrace = text.indexOf('{', cursor);
    if (openingBrace === -1) {
      result += text.slice(cursor);
      break;
    }

    const closingBrace = text.indexOf('}', openingBrace + 1);
    if (closingBrace === -1) {
      result += text.slice(cursor);
      break;
    }

    const key = text.slice(openingBrace + 1, closingBrace);

    if (key.length === 0) {
      result += text.slice(cursor, closingBrace + 1);
      cursor = closingBrace + 1;
      continue;
    }

    result += text.slice(cursor, openingBrace);

    const value = vars[key];
    result += value === undefined ? `{${key}}` : String(value);
    cursor = closingBrace + 1;
  }

  return result;
}
