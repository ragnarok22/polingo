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

  // Replace every {key} with its corresponding value.
  return text.replace(/\{([^}]+)\}/g, (_match, key: string) => {
    const value = vars[key];

    // Leave the placeholder untouched when the variable is missing.
    if (value === undefined) {
      return `{${key}}`;
    }

    // Convert numbers to strings.
    return String(value);
  });
}
