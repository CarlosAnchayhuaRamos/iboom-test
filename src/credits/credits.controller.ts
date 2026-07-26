import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCreditDto } from './dto/create-credit.dto';
import { ListQuotasQueryDto } from './dto/list-quotas-query.dto';
import { CreditsService } from './credits.service';

@ApiTags('credits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('credits')
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Post()
  create(@Body() dto: CreateCreditDto) {
    return this.creditsService.create(dto);
  }

  @Get(':userId/quotas')
  listQuotas(@Param('userId') userId: string, @Query() query: ListQuotasQueryDto) {
    return this.creditsService.listQuotas(userId, query);
  }
}
