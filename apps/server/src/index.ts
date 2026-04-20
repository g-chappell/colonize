import { buildApp } from './app.js';

const port = Number(process.env.APP_PORT ?? 3000);
const host = process.env.APP_HOST ?? '0.0.0.0';

const app = buildApp();

app.listen({ port, host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
