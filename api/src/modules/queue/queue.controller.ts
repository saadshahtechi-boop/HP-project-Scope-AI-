import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { QueueService } from './queue.service';
import { TransitionTicketDto } from './dto/queue.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  /** Live board — reception sees all lanes; a doctor can scope to their own. */
  @Get('board')
  @Roles(Role.RECEPTIONIST, Role.NURSE, Role.ADMIN, Role.DOCTOR)
  getBoard(@Query('practitionerId') practitionerId?: string) {
    return this.queueService.getBoard(practitionerId);
  }

  @Patch(':id/transition')
  @Roles(Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST, Role.ADMIN)
  transition(@Param('id') id: string, @Body() dto: TransitionTicketDto) {
    return this.queueService.transition(id, dto.status);
  }

  /** Doctor calls the next waiting patient in their lane. */
  @Post('call-next')
  @Roles(Role.DOCTOR, Role.ADMIN)
  callNext(@Body('practitionerId') practitionerId: string) {
    return this.queueService.callNext(practitionerId);
  }
}
