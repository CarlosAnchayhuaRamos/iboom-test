import { Module } from '@nestjs/common';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { QuotasController } from './quotas.controller';
import { QuotasService } from './quotas.service';

@Module({
  imports: [IdempotencyModule],
  controllers: [QuotasController],
  providers: [QuotasService],
  exports: [QuotasService],
})
export class QuotasModule {}
