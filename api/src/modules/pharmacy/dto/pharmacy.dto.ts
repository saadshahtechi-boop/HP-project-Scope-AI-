import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

/** Dispense a prescription. Quantity defaults to the prescribed quantity. */
export class DispenseDto {
  @IsOptional() @IsInt() @Min(1) quantity?: number;
}

export class QueryQueueDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit: number = 20;
  @IsOptional() @IsString() patientId?: string;
}
