import { Injectable, OnModuleInit, OnModuleDestroy, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Wraps PrismaClient in a Nest-managed provider so a single connection pool is
 * shared across the app and cleanly opened/closed with the module lifecycle.
 * Inject this into any service that needs database access.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Enables graceful shutdown hooks so Prisma disconnects before the Nest app
   * process exits. Called from main.ts (long-running server) only. In serverless
   * (Vercel) the platform manages the lifecycle, and binding `beforeExit` there
   * can close the app mid-instance — so we skip it when VERCEL is set.
   */
  async enableShutdownHooks(app: INestApplication): Promise<void> {
    if (process.env.VERCEL) return;
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
