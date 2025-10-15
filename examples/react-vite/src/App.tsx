import { PolingoProvider } from '@polingo/react';
import { AppContent } from './components/AppContent';

export function App() {
  return (
    <PolingoProvider
      create={{
        locale: 'en',
        locales: ['en', 'es', 'fr'],
        fallback: 'en',
        cache: true,
        loader: {
          baseUrl: '/i18n',
        },
      }}
      loadingFallback={
        <div className="container">
          <div className="loading">Loading translations...</div>
        </div>
      }
      onError={(error) => {
        console.error('[Polingo] Failed to initialize translator', error);
      }}
    >
      <AppContent />
    </PolingoProvider>
  );
}
