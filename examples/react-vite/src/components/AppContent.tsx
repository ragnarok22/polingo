import { useTranslation } from '@polingo/react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { BasicTranslation } from './BasicTranslation';
import { VariableTranslation } from './VariableTranslation';
import { PluralTranslation } from './PluralTranslation';
import { RichTextTranslation } from './RichTextTranslation';
import { ContextTranslation } from './ContextTranslation';
import { Features } from './Features';

export function AppContent() {
  const { loading, error } = useTranslation();

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading translations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">Failed to load translations: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Polingo React Example</h1>
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
