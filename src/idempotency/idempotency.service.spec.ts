import { ConflictException } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';

describe('IdempotencyService', () => {
  const service = new IdempotencyService();

  it('returns stable hash for same body', () => {
    const first = service.hashRequest({ quotaId: 'quota-1' });
    const second = service.hashRequest({ quotaId: 'quota-1' });

    expect(first).toBe(second);
  });

  it('throws conflict when key is reused with different request hash', () => {
    const first = service.hashRequest({ quotaId: 'quota-1' });
    const second = service.hashRequest({ quotaId: 'quota-2' });

    expect(() => service.assertSameRequest({ requestHash: first }, second)).toThrow(
      ConflictException,
    );
  });
});
