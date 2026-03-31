import express, { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { polingoMiddleware } from '@polingo/node';
import type { Translator } from '@polingo/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const locales = ['en', 'es'] as const;
const localesDirectory = path.resolve(__dirname, '../locales');
const port = Number.parseInt(process.env.PORT ?? '3000', 10);

const app = express();

app.use(
  polingoMiddleware({
    locales: [...locales],
    directory: localesDirectory,
    fallback: 'en',
    watch: process.env.NODE_ENV !== 'production',
    debug: process.env.NODE_ENV !== 'production',
    perLocale: true,
  })
);

function getTranslator(req: Request): Translator {
  return (req as Request & { polingo: Translator }).polingo;
}

app.get('/', (req: Request, res: Response) => {
  const translator = getTranslator(req);

  const headline = translator.t('Welcome to the Polingo Express example!');
  const instructions = translator.t(
    'Try visiting /greeting/Alice?locale=es or /notifications?count=3&locale=es.'
  );

  res
    .type('text/plain')
    .send(
      `${headline}\n\n${instructions}\n${translator.t('Using locale: {locale}', { locale: translator.getLocale() })}\n`
    );
});

app.get('/greeting/:name', (req: Request, res: Response) => {
  const translator = getTranslator(req);
  const name = req.params.name ?? 'friend';
  const greeting = translator.t('Hello {name}!', { name });

  res.json({
    greeting,
    locale: translator.getLocale(),
  });
});

app.get('/notifications', (req: Request, res: Response) => {
  const translator = getTranslator(req);
  const count = Number.parseInt((req.query.count as string | undefined) ?? '0', 10);
  const message = translator.tn(
    'You have {count} notification',
    'You have {count} notifications',
    count,
    { count }
  );

  res.json({
    message,
    count,
    locale: translator.getLocale(),
  });
});

app.listen(port, () => {
  console.log(`[polingo] Express server listening at http://localhost:${port}`);
  console.log(
    `[polingo] Switch locales with ?locale=es or Accept-Language header (supported: ${locales.join(
      ', '
    )})`
  );
});
