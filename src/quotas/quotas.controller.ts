import { BadRequestException, Controller, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QuotasService } from './quotas.service';

@ApiTags('quotas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quotas')
export class QuotasController {
  constructor(private readonly quotasService: QuotasService) {}

  @Post(':id/pay')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  pay(
    @Param('id') id: string,
    @Headers('Idempotency-Key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    return this.quotasService.pay(id, idempotencyKey, request.method, request.path);
  }
}
