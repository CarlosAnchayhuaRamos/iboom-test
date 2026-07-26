import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, QuotaStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const OVERDUE_LOCK_NAME = 'overdue-check';
const LOCK_TTL_MS = 5 * 60 * 1000;
const PENALTY_RATE = 0.15;

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async runOverdueCheck() {
    await this.acquireLock();

    try {
      const result = await this.markOverdueQuotas();
      return result;
    } finally {
      await this.releaseLock();
    }
  }

  private async acquireLock() {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + LOCK_TTL_MS);

    await this.prisma.$transaction(async (tx) => {
      const lock = await tx.jobLock.findUnique({ where: { name: OVERDUE_LOCK_NAME } });

      if (!lock) {
        await tx.jobLock.create({
          data: { name: OVERDUE_LOCK_NAME, lockedAt: now, expiresAt },
        });
        return;
      }

      if (lock.expiresAt > now) {
        throw new ConflictException('Overdue check is already running');
      }

      await tx.jobLock.update({
        where: { name: OVERDUE_LOCK_NAME },
        data: { lockedAt: now, expiresAt },
      });
    });
  }

  private async releaseLock() {
    await this.prisma.jobLock.deleteMany({ where: { name: OVERDUE_LOCK_NAME } });
  }

  private async markOverdueQuotas() {
    const now = new Date();
    const quotas = await this.prisma.quota.findMany({
      where: {
        status: QuotaStatus.PENDING,
        dueDate: { lt: now },
        penaltyApplied: false,
      },
    });

    for (const quota of quotas) {
      const amount = new Prisma.Decimal(quota.amount);
      const amountWithPenalty = amount.plus(amount.mul(PENALTY_RATE));

      await this.prisma.quota.update({
        where: { id: quota.id },
        data: {
          status: QuotaStatus.OVERDUE,
          penaltyApplied: true,
          amount: amountWithPenalty,
        },
      });
    }

    return { processed: quotas.length };
  }
}
