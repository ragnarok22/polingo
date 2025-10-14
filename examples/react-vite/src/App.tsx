import { PolingoProvider } from '@polingo/react';
import { createPolingo } from '@polingo/web';
import { AppContent } from './components/AppContent';

export function App() {
  return (
    <PolingoProvider
      create={() =>
        createPolingo({
          locale: 'en',
          locales: ['en', 'es', 'fr'],
          loader: {
            baseUrl: '/i18n',
          },
        })
      }
    >
      <AppContent />
    </PolingoProvider>
  );
}
