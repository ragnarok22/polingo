/**
 * Interpola variables en un string
 *
 * Soporta variables en formato {name}, {count}, etc.
 *
 * @example
 * interpolate('Hello, {name}!', { name: 'Juan' }) // "Hello, Juan!"
 * interpolate('You have {n} items', { n: 5 }) // "You have 5 items"
 * interpolate('No variables') // "No variables"
 * interpolate('Missing {var}') // "Missing {var}"
 *
 * @param text - Texto con placeholders a interpolar
 * @param vars - Objeto con valores para las variables
 * @returns Texto con variables interpoladas
 */
export function interpolate(text: string, vars?: Record<string, string | number>): string {
  // Si no hay variables, retornar texto original
  if (!vars || Object.keys(vars).length === 0) {
    return text;
  }

  // Reemplazar todas las variables {key} con sus valores
  return text.replace(/\{([^}]+)\}/g, (_match, key: string) => {
    const value = vars[key];

    // Si la variable no existe, dejar el placeholder original
    if (value === undefined) {
      return `{${key}}`;
    }

    // Convertir n�meros a string
    return String(value);
  });
}
