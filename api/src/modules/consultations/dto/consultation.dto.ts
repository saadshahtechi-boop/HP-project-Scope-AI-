import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString,
  Min, ValidateNested,
} from 'class-validator';
import { ConditionClinicalStatus, ObservationCategory } from '@prisma/client';

/** Open a clinical encounter for a checked-in patient. */
export class StartConsultationDto {
  @IsString() patientId!: string;
  @IsString() practitionerId!: string;
  @IsOptional() @IsString() appointmentId?: string;
  @IsOptional() @IsString() queueTicketId?: string;
}

/** The four SOAP fields. Saved incrementally or as part of completion. */
export class SoapNoteDto {
  @IsString() subjective!: string;
  @IsString() objective!: string;
  @IsString() assessment!: string;
  @IsString() plan!: string;
  @IsOptional() @IsBoolean() aiGenerated?: boolean;
}

/** A single vital/observation recorded during the visit (LOINC-coded). */
export class ObservationInputDto {
  @IsString() code!: string;
  @IsString() display!: string;
  @IsOptional() @IsNumber() valueNumber?: number;
  @IsOptional() @IsString() valueString?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsNumber() referenceLow?: number;
  @IsOptional() @IsNumber() referenceHigh?: number;
  @IsOptional() @IsBoolean() isAbnormal?: boolean;
  @IsOptional() @IsEnum(ObservationCategory) category?: ObservationCategory;
}

/** A diagnosis to attach to the encounter (ICD-10-CM). */
export class DiagnosisInputDto {
  @IsString() code!: string;
  @IsString() display!: string;
  @IsOptional() @IsEnum(ConditionClinicalStatus) clinicalStatus?: ConditionClinicalStatus;
}

/** A prescription line (RxNorm-coded drug + sig). */
export class PrescriptionInputDto {
  @IsString() medicationCode!: string;
  @IsString() medicationDisplay!: string;
  @IsOptional() @IsString() medicineId?: string;
  @IsString() dosage!: string;
  @IsString() frequency!: string;
  @IsOptional() @IsInt() @Min(1) durationDays?: number;
  @IsOptional() @IsInt() @Min(1) quantity?: number;
  @IsOptional() @IsString() instructions?: string;
}

/**
 * Complete-visit payload. Everything the doctor entered in one consultation is
 * submitted together and persisted atomically (see CompleteConsultation).
 */
export class CompleteConsultationDto {
  @ValidateNested() @Type(() => SoapNoteDto)
  soap!: SoapNoteDto;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ObservationInputDto)
  observations?: ObservationInputDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => DiagnosisInputDto)
  diagnoses?: DiagnosisInputDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PrescriptionInputDto)
  prescriptions?: PrescriptionInputDto[];

  /** Optional follow-up interval in days; creates nothing yet but recorded on plan. */
  @IsOptional() @IsInt() @Min(1) followUpDays?: number;
}
