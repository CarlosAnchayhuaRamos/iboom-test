import { ApiPropertyOptional } from '@nestjs/swagger';
import { QuotaStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListQuotasQueryDto {
  @ApiPropertyOptional({ enum: QuotaStatus, example: QuotaStatus.PENDING })
  @IsOptional()
  @IsEnum(QuotaStatus)
  status?: QuotaStatus;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;
}
