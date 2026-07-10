import { IsEnum } from 'class-validator';
import { QueueStatus } from '@prisma/client';

export class TransitionTicketDto {
  @IsEnum(QueueStatus) status!: QueueStatus;
}
