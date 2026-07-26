import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateCreditDto {
  @ApiProperty({ example: 'user-1' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 900 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amountTotal: number;

  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numberOfQuotas: number;

  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  startDate: string;
}
