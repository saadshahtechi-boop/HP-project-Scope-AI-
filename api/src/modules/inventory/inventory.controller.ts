import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { ReceiveStockDto, AdjustStockDto, QueryInventoryDto } from './dto/inventory.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Roles(Role.PHARMACIST, Role.ADMIN, Role.NURSE)
  list(@Query() query: QueryInventoryDto) {
    return this.inventoryService.list(query);
  }

  @Get('alerts')
  @Roles(Role.PHARMACIST, Role.ADMIN)
  alerts() {
    return this.inventoryService.alerts();
  }

  @Post('receive')
  @Roles(Role.PHARMACIST, Role.ADMIN)
  receive(@Body() dto: ReceiveStockDto) {
    return this.inventoryService.receive(dto);
  }

  @Post('adjust')
  @Roles(Role.PHARMACIST, Role.ADMIN)
  adjust(@Body() dto: AdjustStockDto) {
    return this.inventoryService.adjust(dto);
  }
}
