import { useState } from 'react';
import { useTranslation } from '@polingo/react';

export function VariableTranslation() {
  const { t } = useTranslation();
  const [name, setName] = useState('World');

  return (
    <section className="card">
      <h2>{t('Translation with Variables')}</h2>
      <p className="example-result">{t('Hello {name}!', { name })}</p>
      <div className="input-group">
        <label htmlFor="name-input">Name:</label>
        <input
          id="name-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a name"
        />
      </div>
      <code className="code-block">
        {`t('Hello {name}!', { name: '${name}' })`}
      </code>
    </section>
  );
}
