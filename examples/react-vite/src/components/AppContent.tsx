import { useTranslation } from '@polingo/react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { BasicTranslation } from './BasicTranslation';
import { VariableTranslation } from './VariableTranslation';
import { PluralTranslation } from './PluralTranslation';
import { RichTextTranslation } from './RichTextTranslation';
import { ContextTranslation } from './ContextTranslation';
import { Features } from './Features';

export function AppContent() {
  const { error, t } = useTranslation();

  if (error) {
    return (
      <div className="container">
        <div className="error-banner">
          <h2>{t('Failed to load translations')}</h2>
          <p>{t('Check the console for more details and reload the page.')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1>{t('Polingo React Example')}</h1>
        <p className="header-subtitle">{t('Explore how Polingo works with React and Vite')}</p>
        <LanguageSwitcher />
      </header>

      <main className="main">
        <BasicTranslation />
        <VariableTranslation />
        <PluralTranslation />
        <RichTextTranslation />
        <ContextTranslation />
        <Features />
      </main>

      <footer className="footer">
        <p>
          Built with Polingo - A modern i18n library using .po/.mo files
        </p>
      </footer>
    </div>
  );
}
