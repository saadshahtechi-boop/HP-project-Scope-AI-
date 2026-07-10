import type { IncomingMessage, ServerResponse } from 'http';
// Import from the compiled output produced by `nest build` (vercel-build).
// @ts-expect-error - dist is generated at build time
import { createApp } from '../dist/app.factory';

/**
 * Vercel serverless entry for the whole API.
 *
 * Vercel routes every /api/* request here (see vercel.json rewrites). We boot
 * the Nest application ONCE and cache the underlying Express instance, so warm
 * invocations skip startup. Cold starts pay the boot cost once.
 */
let cachedHandler: ((req: IncomingMessage, res: ServerResponse) => void) | null = null;

async function getHandler() {
  if (!cachedHandler) {
    const app = await createApp();
    await app.init(); // initialize without listening — serverless owns the socket
    cachedHandler = app.getHttpAdapter().getInstance();
  }
  return cachedHandler;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const expressApp = await getHandler();
  expressApp(req, res);
}
