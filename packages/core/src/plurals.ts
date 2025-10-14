/**
 * Reglas de pluralizaci�n basadas en CLDR
 * Mapea c�digos de idioma a funciones que determinan el �ndice de plural
 */

type PluralRule = (n: number) => number;

/**
 * Regla para idiomas con 2 formas: singular y plural
 * Usado por: ingl�s, espa�ol, franc�s, alem�n, italiano, portugu�s
 * Regla: n != 1
 */
const twoForms: PluralRule = (n: number): number => {
  return n !== 1 ? 1 : 0;
};

/**
 * Regla para polaco
 * 3 formas plurales
 * Regla: n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2
 */
const polishRule: PluralRule = (n: number): number => {
  if (n === 1) return 0;
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 1;
  return 2;
};

/**
 * Regla para ruso, ucraniano, serbio, croata
 * 3 formas plurales
 * Regla: n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2
 */
const russianRule: PluralRule = (n: number): number => {
  if (n % 10 === 1 && n % 100 !== 11) return 0;
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 1;
  return 2;
};

/**
 * Regla para idiomas sin pluralizaci�n
 * Usado por: chino, japon�s, coreano, tailand�s, vietnamita
 * Siempre retorna 0
 */
const noPlural: PluralRule = (): number => {
  return 0;
};

/**
 * Regla para franc�s
 * 2 formas: n > 1
 */
const frenchRule: PluralRule = (n: number): number => {
  return n > 1 ? 1 : 0;
};

/**
 * Regla para rumano
 * 3 formas plurales
 * Regla: n==1 ? 0 : (n==0 || (n%100 > 0 && n%100 < 20)) ? 1 : 2
 */
const romanianRule: PluralRule = (n: number): number => {
  if (n === 1) return 0;
  if (n === 0 || (n % 100 > 0 && n % 100 < 20)) return 1;
  return 2;
};

/**
 * Regla para checo, eslovaco
 * 3 formas plurales
 * Regla: n==1 ? 0 : (n>=2 && n<=4) ? 1 : 2
 */
const czechRule: PluralRule = (n: number): number => {
  if (n === 1) return 0;
  if (n >= 2 && n <= 4) return 1;
  return 2;
};

/**
 * Mapa de c�digos de idioma a reglas de pluralizaci�n
 */
const pluralRules: Record<string, PluralRule> = {
  // Idiomas con 2 formas (n != 1)
  en: twoForms,
  es: twoForms,
  de: twoForms,
  it: twoForms,
  pt: twoForms,
  nl: twoForms,
  sv: twoForms,
  da: twoForms,
  no: twoForms,
  fi: twoForms,
  el: twoForms,
  he: twoForms,
  hu: twoForms,
  tr: twoForms,

  // Franc�s (n > 1)
  fr: frenchRule,

  // Polaco
  pl: polishRule,

  // Ruso, ucraniano, serbio, croata
  ru: russianRule,
  uk: russianRule,
  sr: russianRule,
  hr: russianRule,
  be: russianRule,

  // Checo, eslovaco
  cs: czechRule,
  sk: czechRule,

  // Rumano
  ro: romanianRule,

  // Sin pluralizaci�n
  zh: noPlural,
  ja: noPlural,
  ko: noPlural,
  th: noPlural,
  vi: noPlural,
  id: noPlural,
  ms: noPlural,
};

/**
 * Obtiene el �ndice de plural seg�n idioma y cantidad
 *
 * Basado en reglas CLDR (Common Locale Data Repository)
 *
 * @example
 * getPluralIndex(1, 'en') // 0 (singular)
 * getPluralIndex(5, 'en') // 1 (plural)
 * getPluralIndex(1, 'ru') // 0
 * getPluralIndex(2, 'ru') // 1
 * getPluralIndex(5, 'ru') // 2
 * getPluralIndex(100, 'pl') // 2
 *
 * @param count - N�mero para determinar la forma plural
 * @param locale - C�digo de idioma (ej: 'es', 'en', 'ru')
 * @returns �ndice de la forma plural (0, 1, 2, etc.)
 */
export function getPluralIndex(count: number, locale: string): number {
  // Extract base language code (e.g., 'es-MX' -> 'es')
  const lang = (locale.split('-')[0] ?? locale).toLowerCase();

  // Find rule for the language
  const rule = pluralRules[lang];

  // If no specific rule, use default rule (2 forms)
  if (!rule) {
    return twoForms(count);
  }

  return rule(count);
}
