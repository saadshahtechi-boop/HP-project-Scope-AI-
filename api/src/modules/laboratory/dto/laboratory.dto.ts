import { Type } from 'class-transformer';
import {
  IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested,
} from 'class-validator';
import { ServiceRequestPriority, ServiceRequestStatus } from '@prisma/client';

/** A doctor orders one lab test (LOINC-coded). Multiple orders = multiple calls. */
export class CreateLabOrderDto {
  @IsString() patientId!: string;
  @IsString() requesterId!: string;
  @IsOptional() @IsString() encounterId?: string;

  /** LOINC code + human label for the test being ordered. */
  @IsString() code!: string;
  @IsString() display!: string;

  @IsOptional() @IsEnum(ServiceRequestPriority) priority?: ServiceRequestPriority;
}

/** Move an order along its lifecycle (collect / process / cancel). */
export class AdvanceStatusDto {
  @IsEnum(ServiceRequestStatus) status!: ServiceRequestStatus;
}

/** One measured result value; abnormal flag is derived, not accepted from input. */
export class ResultValueDto {
  @IsString() code!: string;
  @IsString() display!: string;
  @IsOptional() @IsNumber() valueNumber?: number;
  @IsOptional() @IsString() valueString?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsNumber() referenceLow?: number;
  @IsOptional() @IsNumber() referenceHigh?: number;
}

/** Complete an order by entering its result(s); produces the DiagnosticReport. */
export class EnterResultsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ResultValueDto)
  results!: ResultValueDto[];

  @IsOptional() @IsString() conclusion?: string;
}

export class QueryLabDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit: number = 20;
  @IsOptional() @IsEnum(ServiceRequestStatus) status?: ServiceRequestStatus;
  @IsOptional() @IsString() patientId?: string;
}
