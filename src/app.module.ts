import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CreditsModule } from './credits/credits.module';
import { HealthController } from './health/health.controller';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { JobsModule } from './jobs/jobs.module';
import { KafkaModule } from './kafka/kafka.module';
import { PrismaModule } from './prisma/prisma.module';
import { QuotasModule } from './quotas/quotas.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    KafkaModule,
    AuthModule,
    IdempotencyModule,
    CreditsModule,
    QuotasModule,
    JobsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
