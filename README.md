# polingo
[![CI](https://github.com/ragnarok22/polingo/actions/workflows/ci.yml/badge.svg)](https://github.com/ragnarok22/polingo/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Modern i18n library using .po/.mo files for universal JavaScript


Express example:

```js
// express-app.ts
import express from 'express';
import { createPolingo } from '@polingo/node';

const app = express();

// Setup Polingo
const polingo = await createPolingo({
  locale: 'es',
  locales: ['es', 'en'],
  directory: './locales',
});

// Middleware para detectar idioma
app.use((req, res, next) => {
  const locale = req.headers['accept-language']?.split(',')[0] || 'en';
  polingo.setLocale(locale);
  req.polingo = polingo;
  next();
});

// Rutas
app.get('/', (req, res) => {
  const greeting = req.polingo.t('Welcome, {name}!', { name: 'User' });
  res.send(greeting);
});

app.listen(3000);
```

