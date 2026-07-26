import { ConflictException } from '@nestjs/common';
import { Prisma, QuotaStatus } from '@prisma/client';
import { JobsService } from './jobs.service';

describe('JobsService', () => {
  it('marks pending expired quota as overdue and applies penalty once', async () => {
    const quota = {
      id: 'quota-1',
      amount: new Prisma.Decimal(100),
      status: QuotaStatus.PENDING,
      penaltyApplied: false,
    };
    const prismaMock = {
      $transaction: jest.fn((callback) =>
        callback({
          jobLock: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
          },
        }),
      ),
      jobLock: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      quota: {
        findMany: jest.fn().mockResolvedValue([quota]),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const service = new JobsService(prismaMock as never);

    await expect(service.runOverdueCheck()).resolves.toEqual({ processed: 1 });

    expect(prismaMock.quota.update).toHaveBeenCalledWith({
      where: { id: 'quota-1' },
      data: {
        status: QuotaStatus.OVERDUE,
        penaltyApplied: true,
        amount: new Prisma.Decimal(115),
      },
    });
  });

  it('returns conflict when active lock exists', async () => {
    const prismaMock = {
      $transaction: jest.fn((callback) =>
        callback({
          jobLock: {
            findUnique: jest.fn().mockResolvedValue({
              name: 'overdue-check',
              expiresAt: new Date(Date.now() + 60_000),
            }),
          },
        }),
      ),
    };
    const service = new JobsService(prismaMock as never);

    await expect(service.runOverdueCheck()).rejects.toThrow(ConflictException);
  });
});
