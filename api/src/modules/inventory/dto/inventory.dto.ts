import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/** Receive stock into a batch (creates the batch if new) via a PURCHASE_IN movement. */
export class ReceiveStockDto {
  @IsString() medicineId!: string;
  @IsString() batchNumber!: string;
  @IsInt() @Min(1) quantity!: number;
  /** ISO date string. */
  @IsString() expiryDate!: string;
  @IsNumber() @Min(0) costPrice!: number;
  @IsOptional() @IsString() barcode?: string;
}

/** Manual stock correction (stock take, damage). Delta may be negative. */
export class AdjustStockDto {
  @IsString() medicineId!: string;
  @IsOptional() @IsString() batchId?: string;
  @IsInt() quantityDelta!: number;
  @IsString() reason!: string;
}

export class QueryInventoryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit: number = 50;
  @IsOptional() @IsString() search?: string;
}
