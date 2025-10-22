/**
 * Pluralization rules based on CLDR.
 * Maps language codes to functions that determine the plural form index.
 */

type PluralRule = (n: number) => number;

/**
 * Rule for languages with two forms: singular and plural.
 * Used by: English, Spanish, German, Italian, Portuguese, Dutch, Swedish,
 * Danish, Norwegian, Finnish, Greek, Hebrew, Hungarian, Turkish.
 * Rule: n != 1
 */
const twoForms: PluralRule = (n: number): number => {
  return n !== 1 ? 1 : 0;
};

/**
 * Rule for Polish.
 * Three plural forms.
 * Rule: n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2
 */
const polishRule: PluralRule = (n: number): number => {
  if (n === 1) return 0;
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 1;
  return 2;
};

/**
 * Rule for Russian, Ukrainian, Serbian, Croatian, Belarusian.
 * Three plural forms.
 * Rule: n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2
 */
const russianRule: PluralRule = (n: number): number => {
  if (n % 10 === 1 && n % 100 !== 11) return 0;
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 1;
  return 2;
};

/**
 * Rule for languages without pluralization.
 * Used by: Chinese, Japanese, Korean, Thai, Vietnamese, Indonesian, Malay.
 * Always returns 0.
 */
const noPlural: PluralRule = (): number => {
  return 0;
};

/**
 * Rule for French.
 * Two forms: n > 1.
 * French treats 0 and 1 the same, hence the dedicated rule.
 */
const frenchRule: PluralRule = (n: number): number => {
  return n > 1 ? 1 : 0;
};

/**
 * Rule for Romanian.
 * Three plural forms.
 * Rule: n==1 ? 0 : (n==0 || (n%100 > 0 && n%100 < 20)) ? 1 : 2
 */
const romanianRule: PluralRule = (n: number): number => {
  if (n === 1) return 0;
  if (n === 0 || (n % 100 > 0 && n % 100 < 20)) return 1;
  return 2;
};

/**
 * Rule for Czech and Slovak.
 * Three plural forms.
 * Rule: n==1 ? 0 : (n>=2 && n<=4) ? 1 : 2
 */
const czechRule: PluralRule = (n: number): number => {
  if (n === 1) return 0;
  if (n >= 2 && n <= 4) return 1;
  return 2;
};

/**
 * Map of language codes to pluralization rules.
 */
const pluralRules: Record<string, PluralRule> = {
  // Languages with two forms (n != 1)
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

  // French (n > 1)
  fr: frenchRule,

  // Polish
  pl: polishRule,

  // Russian, Ukrainian, Serbian, Croatian, Belarusian
  ru: russianRule,
  uk: russianRule,
  sr: russianRule,
  hr: russianRule,
  be: russianRule,

  // Czech, Slovak
  cs: czechRule,
  sk: czechRule,

  // Romanian
  ro: romanianRule,

  // Languages without plural forms
  zh: noPlural,
  ja: noPlural,
  ko: noPlural,
  th: noPlural,
  vi: noPlural,
  id: noPlural,
  ms: noPlural,
};

/**
 * Determine the plural form index based on locale and count.
 *
 * Based on CLDR (Common Locale Data Repository) rules.
 *
 * @example
 * getPluralIndex(1, 'en') // 0 (singular)
 * getPluralIndex(5, 'en') // 1 (plural)
 * getPluralIndex(1, 'ru') // 0
 * getPluralIndex(2, 'ru') // 1
 * getPluralIndex(5, 'ru') // 2
 * getPluralIndex(100, 'pl') // 2
 *
 * @param count - Number used to determine the plural form
 * @param locale - Locale code (e.g., 'es', 'en', 'ru')
 * @returns Index of the plural form (0, 1, 2, etc.)
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
