import { Trans, useTranslation } from '@polingo/react';

export function RichTextTranslation() {
  const { t } = useTranslation();

  return (
    <section className="card">
      <h2>{t('Rich Text Translation')}</h2>
      <p className="example-result">
        <Trans
          message="Read the <0>documentation</0> to learn more"
          components={[<a href="https://github.com/ragnarok22/polingo" target="_blank" rel="noopener noreferrer" />]}
        />
      </p>
      <p className="example-result">
        <Trans
          message="This text is <0>bold</0> and this is <1>italic</1>"
          components={[<strong />, <em />]}
        />
      </p>
      <code className="code-block">
        {`<Trans
  message="Read the <0>documentation</0> to learn more"
  components={[<a href="..." />]}
/>`}
      </code>
    </section>
  );
}
