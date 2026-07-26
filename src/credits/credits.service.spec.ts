import { CreditsService } from './credits.service';

describe('CreditsService', () => {
  const prisma = {} as never;
  const service = new CreditsService(prisma);

  it('calculates quota amounts and preserves cents', () => {
    const quotas = service.buildQuotas(100, 3, '2026-08-01');

    expect(quotas.map((quota) => quota.amount.toNumber())).toEqual([33.33, 33.33, 33.34]);
  });

  it('spaces due dates every 30 days', () => {
    const quotas = service.buildQuotas(900, 3, '2026-08-01');

    expect(quotas.map((quota) => quota.dueDate.toISOString().slice(0, 10))).toEqual([
      '2026-08-01',
      '2026-08-31',
      '2026-09-30',
    ]);
  });
});
