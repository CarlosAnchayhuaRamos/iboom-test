import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreditStatus, Prisma, QuotaStatus } from '@prisma/client';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { KafkaService } from '../kafka/kafka.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuotasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotencyService: IdempotencyService,
    private readonly kafkaService: KafkaService,
  ) {}

  async pay(quotaId: string, key: string, method: string, path: string) {
    const requestHash = this.idempotencyService.hashRequest({ quotaId });

    return this.prisma.$transaction(async (tx) => {
      const existing = await this.idempotencyService.findRecord(tx, key, method, path);

      if (existing) {
        this.idempotencyService.assertSameRequest(existing, requestHash);
        return existing.responseBody;
      }

      const quota = await tx.quota.findUnique({ where: { id: quotaId } });

      if (!quota) {
        throw new NotFoundException('Quota not found');
      }

      if (quota.status === QuotaStatus.PAID) {
        throw new ConflictException('Quota already paid');
      }

      const paidQuota = await tx.quota.update({
        where: { id: quotaId },
        data: { status: QuotaStatus.PAID, paidAt: new Date() },
      });
      const unpaidCount = await tx.quota.count({
        where: {
          creditId: paidQuota.creditId,
          status: { in: [QuotaStatus.PENDING, QuotaStatus.OVERDUE] },
        },
      });
      const credit =
        unpaidCount === 0
          ? await tx.credit.update({
              where: { id: paidQuota.creditId },
              data: { status: CreditStatus.FINALIZADO },
            })
          : await tx.credit.findUniqueOrThrow({ where: { id: paidQuota.creditId } });
      const responseBody = { quota: paidQuota, credit };

      await tx.idempotencyRecord.create({
        data: {
          key,
          method,
          path,
          requestHash,
          statusCode: 200,
          responseBody: responseBody as Prisma.InputJsonValue,
        },
      });

      await this.publishPaymentEvents(paidQuota, credit.status === CreditStatus.FINALIZADO);

      return responseBody;
    });
  }

  private async publishPaymentEvents(
    quota: { id: string; creditId: string },
    creditCompleted: boolean,
  ) {
    await this.kafkaService.publish('quota.paid', {
      quotaId: quota.id,
      creditId: quota.creditId,
      occurredAt: new Date().toISOString(),
    });

    if (!creditCompleted) return;

    await this.kafkaService.publish('credit.completed', {
      creditId: quota.creditId,
      occurredAt: new Date().toISOString(),
    });
  }
}
