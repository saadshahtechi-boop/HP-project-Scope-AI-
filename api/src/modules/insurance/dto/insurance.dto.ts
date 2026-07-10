import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ClaimStatus } from '@prisma/client';

export class CreateClaimDto {
  @IsString() invoiceId!: string;
  @IsString() policyId!: string;
  @IsNumber() @Min(0) claimedAmount!: number;
}

/** Resolve a claim (approve / partially approve / deny). */
export class ResolveClaimDto {
  @IsEnum(ClaimStatus) status!: ClaimStatus;
  @IsOptional() @IsNumber() @Min(0) approvedAmount?: number;
}

export class QueryClaimsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit: number = 20;
  @IsOptional() @IsEnum(ClaimStatus) status?: ClaimStatus;
}
