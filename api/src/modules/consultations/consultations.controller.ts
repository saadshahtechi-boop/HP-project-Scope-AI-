import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ConsultationsService } from './consultations.service';
import {
  StartConsultationDto, SoapNoteDto, CompleteConsultationDto,
} from './dto/consultation.dto';
import { Roles } from '../../common/decorators/roles.decorator';

/**
 * Clinical write surface — restricted to doctors (and nurses for vitals/notes).
 * The composite complete-visit endpoint is the one the Consultation screen calls
 * when the doctor clicks "Complete visit".
 */
@Controller('consultations')
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Post('start')
  @Roles(Role.DOCTOR, Role.NURSE, Role.ADMIN)
  start(@Body() dto: StartConsultationDto) {
    return this.consultationsService.start(dto);
  }

  @Get(':id/workspace')
  @Roles(Role.DOCTOR, Role.NURSE, Role.ADMIN)
  getWorkspace(@Param('id') id: string) {
    return this.consultationsService.getWorkspace(id);
  }

  @Put(':id/soap')
  @Roles(Role.DOCTOR, Role.NURSE)
  saveSoap(@Param('id') id: string, @Body() dto: SoapNoteDto) {
    return this.consultationsService.saveSoap(id, dto);
  }

  @Post(':id/complete')
  @Roles(Role.DOCTOR)
  complete(@Param('id') id: string, @Body() dto: CompleteConsultationDto) {
    return this.consultationsService.complete(id, dto);
  }

  @Get(':id')
  @Roles(Role.DOCTOR, Role.NURSE, Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.consultationsService.findOne(id);
  }
}
