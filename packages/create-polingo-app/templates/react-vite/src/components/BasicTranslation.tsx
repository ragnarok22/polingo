import { useTranslation } from '@polingo/react';

export function BasicTranslation() {
  const { t } = useTranslation();

  return (
    <section className="card">
      <h2>{t('Basic Translation')}</h2>
      <p className="example-title">{t('Welcome to Polingo')}</p>
      <p className="example-subtitle">{t('A modern i18n library for JavaScript')}</p>
      <code className="code-block">
        {`const { t } = useTranslation();
t('Welcome to Polingo')`}
      </code>
    </section>
  );
}
