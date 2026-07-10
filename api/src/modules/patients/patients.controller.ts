import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { QueryPatientsDto } from './dto/query-patients.dto';
import { Roles } from '../../common/decorators/roles.decorator';

/**
 * Access model:
 * - Registration & edits: reception, nurse, admin (front-desk workflow).
 * - Reads: any clinical role also needs to view patients, so GETs allow the
 *   full set of staff roles. Deletion is admin-only.
 */
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @Roles(Role.RECEPTIONIST, Role.NURSE, Role.ADMIN)
  create(@Body() dto: CreatePatientDto) {
    return this.patientsService.create(dto);
  }

  @Get()
  @Roles(Role.RECEPTIONIST, Role.NURSE, Role.ADMIN, Role.DOCTOR, Role.LAB_TECH, Role.PHARMACIST)
  findMany(@Query() query: QueryPatientsDto) {
    return this.patientsService.findMany(query);
  }

  @Get(':id')
  @Roles(Role.RECEPTIONIST, Role.NURSE, Role.ADMIN, Role.DOCTOR, Role.LAB_TECH, Role.PHARMACIST)
  findOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
  }

  @Get(':id/timeline')
  @Roles(Role.DOCTOR, Role.NURSE, Role.ADMIN)
  getTimeline(@Param('id') id: string) {
    return this.patientsService.getTimeline(id);
  }

  @Patch(':id')
  @Roles(Role.RECEPTIONIST, Role.NURSE, Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdatePatientDto) {
    return this.patientsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.patientsService.remove(id);
  }
}
