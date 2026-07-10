import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createApp } from './app.factory';

/**
 * Long-running server entry — used locally and in the Docker image.
 * On Vercel the serverless handler in api/index.ts is used instead.
 */
async function bootstrap(): Promise<void> {
  const app = await createApp();
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 4000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`Techciko Health Suite API running on port ${port} (path /api)`, 'Bootstrap');
}

bootstrap();
