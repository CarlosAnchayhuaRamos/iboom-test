import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';

@Injectable()
export class IdempotencyService {
  hashRequest(body: unknown) {
    return createHash('sha256').update(JSON.stringify(body ?? {})).digest('hex');
  }

  assertSameRequest(record: { requestHash: string }, requestHash: string) {
    if (record.requestHash === requestHash) return;

    throw new ConflictException('Idempotency-Key already used with different request');
  }

  async findRecord(
    tx: Prisma.TransactionClient,
    key: string,
    method: string,
    path: string,
  ) {
    return tx.idempotencyRecord.findUnique({
      where: { key_method_path: { key, method, path } },
    });
  }
}
