import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { InsuranceService } from './insurance.service';
import { CreateClaimDto, ResolveClaimDto, QueryClaimsDto } from './dto/insurance.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('insurance')
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Post('claims')
  @Roles(Role.RECEPTIONIST, Role.ADMIN)
  create(@Body() dto: CreateClaimDto) {
    return this.insuranceService.create(dto);
  }

  @Get('claims')
  @Roles(Role.RECEPTIONIST, Role.ADMIN)
  findMany(@Query() query: QueryClaimsDto) {
    return this.insuranceService.findMany(query);
  }

  @Patch('claims/:id/submit')
  @Roles(Role.RECEPTIONIST, Role.ADMIN)
  submit(@Param('id') id: string) {
    return this.insuranceService.submit(id);
  }

  @Patch('claims/:id/resolve')
  @Roles(Role.ADMIN)
  resolve(@Param('id') id: string, @Body() dto: ResolveClaimDto) {
    return this.insuranceService.resolve(id, dto);
  }

  @Patch('claims/:id/paid')
  @Roles(Role.ADMIN)
  markPaid(@Param('id') id: string) {
    return this.insuranceService.markPaid(id);
  }
}
