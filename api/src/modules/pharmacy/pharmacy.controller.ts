import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PharmacyService } from './pharmacy.service';
import { DispenseDto, QueryQueueDto } from './dto/pharmacy.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('pharmacy')
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Get('queue')
  @Roles(Role.PHARMACIST, Role.ADMIN)
  queue(@Query() query: QueryQueueDto) {
    return this.pharmacyService.queue(query);
  }

  @Post('dispense/:medicationRequestId')
  @Roles(Role.PHARMACIST, Role.ADMIN)
  dispense(@Param('medicationRequestId') id: string, @Body() dto: DispenseDto) {
    return this.pharmacyService.dispense(id, dto);
  }
}
