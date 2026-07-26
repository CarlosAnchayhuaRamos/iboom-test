import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCreditDto } from './dto/create-credit.dto';
import { ListQuotasQueryDto } from './dto/list-quotas-query.dto';

@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCreditDto) {
    const quotas = this.buildQuotas(dto.amountTotal, dto.numberOfQuotas, dto.startDate);

    return this.prisma.credit.create({
      data: {
        userId: dto.userId,
        amountTotal: new Prisma.Decimal(dto.amountTotal),
        numberOfQuotas: dto.numberOfQuotas,
        quotas: {
          create: quotas.map((quota) => ({
            amount: quota.amount,
            dueDate: quota.dueDate,
          })),
        },
      },
      include: { quotas: { orderBy: { dueDate: 'asc' } } },
    });
  }

  async listQuotas(userId: string, query: ListQuotasQueryDto) {
    const where = {
      credit: { userId },
      ...(query.status ? { status: query.status } : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.quota.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.quota.count({ where }),
    ]);

    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  buildQuotas(amountTotal: number, numberOfQuotas: number, startDate: string) {
    const baseAmount = Math.floor((amountTotal / numberOfQuotas) * 100) / 100;
    const baseTotal = baseAmount * numberOfQuotas;
    const remainder = Math.round((amountTotal - baseTotal) * 100) / 100;

    return Array.from({ length: numberOfQuotas }, (_, index) => {
      const dueDate = new Date(startDate);
      dueDate.setUTCDate(dueDate.getUTCDate() + index * 30);
      const amount = index === numberOfQuotas - 1 ? baseAmount + remainder : baseAmount;

      return {
        amount: new Prisma.Decimal(amount.toFixed(2)),
        dueDate,
      };
    });
  }
}
