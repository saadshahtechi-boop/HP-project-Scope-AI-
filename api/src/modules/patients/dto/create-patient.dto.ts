import { Type } from 'class-transformer';
import {
  IsArray, IsDateString, IsEmail, IsEnum, IsOptional, IsString,
  MaxLength, ValidateNested,
} from 'class-validator';
import { BloodGroup, Gender, HistoryType, AllergyCriticality, AllergySeverity } from '@prisma/client';

/** One allergy entry captured at registration. */
export class CreateAllergyDto {
  @IsString() substanceCode!: string;
  @IsString() substanceDisplay!: string;
  @IsOptional() @IsString() reaction?: string;
  @IsOptional() @IsEnum(AllergyCriticality) criticality?: AllergyCriticality;
  @IsOptional() @IsEnum(AllergySeverity) severity?: AllergySeverity;
}

/** One past-medical / surgical / family history entry. */
export class CreateHistoryDto {
  @IsEnum(HistoryType) type!: HistoryType;
  @IsString() @MaxLength(1000) summary!: string;
}

/** Emergency contact captured at registration. */
export class CreateEmergencyContactDto {
  @IsString() name!: string;
  @IsString() relationship!: string;
  @IsString() phone!: string;
}

/** Insurance policy captured at registration. */
export class CreateInsuranceDto {
  @IsString() provider!: string;
  @IsString() policyNumber!: string;
  @IsOptional() @IsString() coveragePlan?: string;
}

export class CreatePatientDto {
  @IsString() @MaxLength(100) firstName!: string;
  @IsString() @MaxLength(100) lastName!: string;
  @IsEnum(Gender) gender!: Gender;

  @IsDateString()
  dateOfBirth!: string;

  @IsOptional() @IsEnum(BloodGroup) bloodGroup?: BloodGroup;

  @IsString() phone!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() addressLine?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() country?: string;

  @IsOptional() @ValidateNested() @Type(() => CreateEmergencyContactDto)
  emergencyContact?: CreateEmergencyContactDto;

  @IsOptional() @ValidateNested() @Type(() => CreateInsuranceDto)
  insurance?: CreateInsuranceDto;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreateAllergyDto)
  allergies?: CreateAllergyDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreateHistoryDto)
  histories?: CreateHistoryDto[];
}
