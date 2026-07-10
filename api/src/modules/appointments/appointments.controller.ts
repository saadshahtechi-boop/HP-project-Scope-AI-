import {
  Body, Controller, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { Role, QueuePriority } from '@prisma/client';
import { AppointmentsService } from './appointments.service';
import {
  CreateAppointmentDto, RescheduleAppointmentDto, ChangeStatusDto, QueryAppointmentsDto,
} from './dto/appointment.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(Role.RECEPTIONIST, Role.ADMIN, Role.DOCTOR)
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(dto);
  }

  @Get('practitioners')
  @Roles(Role.RECEPTIONIST, Role.ADMIN, Role.DOCTOR, Role.NURSE)
  listPractitioners() {
    return this.appointmentsService.listPractitioners();
  }

  @Get()
  @Roles(Role.RECEPTIONIST, Role.ADMIN, Role.DOCTOR, Role.NURSE)
  findMany(@Query() query: QueryAppointmentsDto) {
    return this.appointmentsService.findMany(query);
  }

  @Get(':id')
  @Roles(Role.RECEPTIONIST, Role.ADMIN, Role.DOCTOR, Role.NURSE)
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Patch(':id/reschedule')
  @Roles(Role.RECEPTIONIST, Role.ADMIN)
  reschedule(@Param('id') id: string, @Body() dto: RescheduleAppointmentDto) {
    return this.appointmentsService.reschedule(id, dto);
  }

  @Patch(':id/status')
  @Roles(Role.RECEPTIONIST, Role.ADMIN, Role.DOCTOR)
  changeStatus(@Param('id') id: string, @Body() dto: ChangeStatusDto) {
    return this.appointmentsService.changeStatus(id, dto.status);
  }

  /** Front-desk check-in — spawns the queue ticket. Optional priority lane. */
  @Post(':id/check-in')
  @Roles(Role.RECEPTIONIST, Role.NURSE, Role.ADMIN)
  checkIn(@Param('id') id: string, @Body('priority') priority?: QueuePriority) {
    return this.appointmentsService.checkIn(id, priority ?? 'NORMAL');
  }
}
