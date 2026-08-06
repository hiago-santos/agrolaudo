import { buildApp } from './app.js';
import { loadEnv } from './env.js';
import { ensureMinioBucket } from './lib/minio.js';

const env = loadEnv();
const app = buildApp(env);

const minioOk = await ensureMinioBucket(env);
if (!minioOk) {
  app.log.warn(
    'MinIO indisponível no boot — a API sobe normalmente, mas anexos de projeto só funcionam quando a conexão estiver ok. Confira MINIO_ENDPOINT, MINIO_PORT e MINIO_USE_SSL (443 exige SSL).',
  );
} else {
  app.log.info(`MinIO conectado · bucket "${env.MINIO_BUCKET}"`);
}

app
  .listen({ port: env.PORT, host: env.HOST })
  .then(() => {
    app.log.info(`AgroLaudo API em http://${env.HOST}:${env.PORT} · docs em /docs`);
  })
  .catch((error: unknown) => {
    app.log.error(error);
    process.exit(1);
  });
