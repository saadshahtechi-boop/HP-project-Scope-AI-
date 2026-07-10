import { IsArray, IsOptional, IsString } from 'class-validator';

export class AnalyticsQueryDto {
  @IsString() query!: string;
}

export class GenerateSoapDto {
  @IsString() patientId!: string;
  @IsOptional() @IsString() complaint?: string;
}

export class SummarizeDto {
  @IsString() patientId!: string;
}

export class ReferralDto {
  @IsString() patientId!: string;
  @IsString() toSpecialty!: string;
  @IsOptional() @IsString() reason?: string;
}

export class DischargeDto {
  @IsString() patientId!: string;
  @IsOptional() @IsString() visitReason?: string;
}

export class FollowUpDto {
  @IsString() patientId!: string;
  @IsOptional() @IsString() whenText?: string;
}

export class MedicineSuggestionDto {
  @IsArray() @IsString({ each: true }) conditionCodes!: string[];
}
