import { buildApp } from './app.js';
import { loadEnv } from './env.js';

const env = loadEnv();
const app = buildApp(env);

app
  .listen({ port: env.PORT, host: env.HOST })
  .then(() => {
    app.log.info(`AgroLaudo API em http://${env.HOST}:${env.PORT} · docs em /docs`);
  })
  .catch((error: unknown) => {
    app.log.error(error);
    process.exit(1);
  });
