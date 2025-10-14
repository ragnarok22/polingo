import process from 'node:process';
import { runCli } from './index.js';

void runCli().then((code) => {
  if (code !== 0) {
    process.exitCode = code;
  }
});
