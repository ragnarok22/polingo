import { useState } from 'react';
import { useTranslation } from '@polingo/react';

export function PluralTranslation() {
  const { tn, t } = useTranslation();
  const [count, setCount] = useState(1);

  return (
    <section className="card">
      <h2>{t('Plural Translation')}</h2>
      <p className="example-result">
        {tn('You have {count} new message', 'You have {count} new messages', count, { count })}
      </p>
      <div className="button-group">
        <button onClick={() => setCount(Math.max(0, count - 1))}>-</button>
        <span className="counter">{count}</span>
        <button onClick={() => setCount(count + 1)}>+</button>
        <button onClick={() => setCount(0)} className="reset">
          {t('Reset Counter')}
        </button>
      </div>
      <code className="code-block">
        {`tn(
  'You have {count} new message',
  'You have {count} new messages',
  ${count},
  { count: ${count} }
)`}
      </code>
    </section>
  );
}
