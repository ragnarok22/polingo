import { createRequire } from 'node:module';
import process from 'node:process';

const require = createRequire(import.meta.url);
const { runCli } = require('./cli.cjs') as typeof import('./index.js');

void runCli().then((code) => {
  if (code !== 0) {
    process.exitCode = code;
  }
});
