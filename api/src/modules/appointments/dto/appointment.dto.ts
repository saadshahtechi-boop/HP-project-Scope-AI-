import { Type } from 'class-transformer';
import {
  IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min,
} from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class CreateAppointmentDto {
  @IsString() patientId!: string;
  @IsString() practitionerId!: string;
  @IsDateString() scheduledStart!: string;
  @IsDateString() scheduledEnd!: string;
  @IsOptional() @IsString() reason?: string;
}

export class RescheduleAppointmentDto {
  @IsDateString() scheduledStart!: string;
  @IsDateString() scheduledEnd!: string;
}

/** Explicit status change (confirm / cancel / no-show). Check-in has its own route. */
export class ChangeStatusDto {
  @IsEnum(AppointmentStatus) status!: AppointmentStatus;
}

export class QueryAppointmentsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 20;

  @IsOptional() @IsString() practitionerId?: string;
  @IsOptional() @IsString() patientId?: string;
  @IsOptional() @IsEnum(AppointmentStatus) status?: AppointmentStatus;

  /** ISO date (YYYY-MM-DD) to fetch a single day's schedule. */
  @IsOptional() @IsDateString() date?: string;
}
