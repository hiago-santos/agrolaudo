import * as Minio from 'minio';

import type { Env } from '../env.js';

let client: Minio.Client | null = null;
let bucketReady: Promise<void> | null = null;
let bucketAvailable = false;

function normalizeMinioEndpoint(endpoint: string): string {
  return endpoint
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '');
}

function resolveMinioOptions(env: Env): {
  endPoint: string;
  port: number;
  useSSL: boolean;
} {
  const endPoint = normalizeMinioEndpoint(env.MINIO_ENDPOINT);
  const port = env.MINIO_PORT;
  // Railway e outros proxies HTTPS costumam expor a API na 443 — sem TLS o socket cai (ECONNRESET).
  const useSSL = env.MINIO_USE_SSL || port === 443;
  return { endPoint, port, useSSL };
}

export function getMinioClient(env: Env): Minio.Client {
  if (!client) {
    const { endPoint, port, useSSL } = resolveMinioOptions(env);
    client = new Minio.Client({
      endPoint,
      port,
      useSSL,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
    });
  }
  return client;
}

export function isMinioReady(): boolean {
  return bucketAvailable;
}

/** Garante que o bucket existe — falha silenciosa no boot não derruba a API. */
export async function ensureMinioBucket(env: Env): Promise<boolean> {
  if (bucketAvailable) return true;
  if (!bucketReady) {
    bucketReady = (async () => {
      const minio = getMinioClient(env);
      const exists = await minio.bucketExists(env.MINIO_BUCKET);
      if (!exists) {
        await minio.makeBucket(env.MINIO_BUCKET, env.MINIO_REGION);
      }
      bucketAvailable = true;
    })().catch((error: unknown) => {
      bucketReady = null;
      throw error;
    });
  }
  try {
    await bucketReady;
    return true;
  } catch {
    bucketReady = null;
    return false;
  }
}

export function buildAttachmentObjectKey(
  projectId: string,
  side: 'PRODUCER' | 'BANK',
  attachmentId: string,
  fileName: string,
): string {
  const safeName = fileName.replace(/[^\w.\-()+\s]/g, '_').replace(/\s+/g, '_');
  return `projects/${projectId}/${side.toLowerCase()}/${attachmentId}/${safeName}`;
}
