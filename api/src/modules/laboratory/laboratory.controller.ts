import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { LaboratoryService } from './laboratory.service';
import {
  CreateLabOrderDto, AdvanceStatusDto, EnterResultsDto, QueryLabDto,
} from './dto/laboratory.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('laboratory')
export class LaboratoryController {
  constructor(private readonly laboratoryService: LaboratoryService) {}

  /** Doctors place lab orders (also happens inline during consultation). */
  @Post('orders')
  @Roles(Role.DOCTOR, Role.ADMIN)
  createOrder(@Body() dto: CreateLabOrderDto) {
    return this.laboratoryService.createOrder(dto);
  }

  @Get('orders')
  @Roles(Role.LAB_TECH, Role.DOCTOR, Role.ADMIN, Role.NURSE)
  worklist(@Query() query: QueryLabDto) {
    return this.laboratoryService.worklist(query);
  }

  @Get('summary')
  @Roles(Role.LAB_TECH, Role.ADMIN, Role.DOCTOR)
  summary() {
    return this.laboratoryService.pipelineSummary();
  }

  @Get('orders/:id')
  @Roles(Role.LAB_TECH, Role.DOCTOR, Role.ADMIN, Role.NURSE)
  findOne(@Param('id') id: string) {
    return this.laboratoryService.findOne(id);
  }

  /** Lab tech advances collection/processing. */
  @Patch('orders/:id/status')
  @Roles(Role.LAB_TECH, Role.ADMIN)
  advance(@Param('id') id: string, @Body() dto: AdvanceStatusDto) {
    return this.laboratoryService.advance(id, dto.status);
  }

  /** Lab tech enters results — completes the order and produces the report. */
  @Post('orders/:id/results')
  @Roles(Role.LAB_TECH, Role.ADMIN)
  enterResults(@Param('id') id: string, @Body() dto: EnterResultsDto) {
    return this.laboratoryService.enterResults(id, dto);
  }
}
