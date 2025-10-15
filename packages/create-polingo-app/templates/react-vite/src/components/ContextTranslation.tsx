import { useTranslation } from '@polingo/react';

export function ContextTranslation() {
  const { tp, t } = useTranslation();

  return (
    <section className="card">
      <h2>{t('Translation with Context')}</h2>
      <p className="example-description">
        Context helps disambiguate identical strings with different meanings:
      </p>
      <div className="context-examples">
        <div className="context-item">
          <span className="context-label">Menu context:</span>
          <span className="context-value">{tp('menu', 'File')}</span>
        </div>
        <div className="context-item">
          <span className="context-label">Document context:</span>
          <span className="context-value">{tp('document', 'File')}</span>
        </div>
      </div>
      <code className="code-block">
        {`tp('menu', 'File')     // "Archivo" in Spanish
tp('document', 'File') // "Archivo (Documento)" in Spanish`}
      </code>
    </section>
  );
}
