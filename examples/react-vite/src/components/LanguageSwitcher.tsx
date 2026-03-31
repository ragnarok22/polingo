import { useTranslation } from '@polingo/react';

export function LanguageSwitcher() {
  const { locale, loading, setLocale, t } = useTranslation();

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
  ];

  return (
    <div className="language-switcher" role="group" aria-label={t('Switch Language')}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          type="button"
          className={`lang-button ${locale === lang.code ? 'active' : ''}`}
          onClick={() => setLocale(lang.code)}
          disabled={loading || locale === lang.code}
          aria-pressed={locale === lang.code}
          title={lang.name}
          aria-label={
            locale === lang.code
              ? `${lang.name} (${t('Current language')})`
              : `${lang.name}`
          }
        >
          <span className="flag">{lang.flag}</span>
          <span className="lang-name">{lang.name}</span>
        </button>
      ))}
    </div>
  );
}
