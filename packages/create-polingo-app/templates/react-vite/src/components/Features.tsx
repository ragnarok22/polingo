import { useTranslation } from '@polingo/react';

export function Features() {
  const { t } = useTranslation();

  const features = [
    'Industry-standard .po/.mo files',
    'Framework-agnostic core',
    'React hooks and components',
    'CLI tools for workflow',
    'TypeScript support',
    'Multiple domains support',
  ];

  return (
    <section className="card features-card">
      <h2>{t('Features')}</h2>
      <ul className="features-list">
        {features.map((feature) => (
          <li key={feature}>{t(feature)}</li>
        ))}
      </ul>
    </section>
  );
}
