import { Type } from 'class-transformer';
import {
  IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested,
} from 'class-validator';
import { InvoiceItemCategory, InvoiceStatus, PaymentMethod } from '@prisma/client';

/** A single charge line. lineTotal is derived server-side, never trusted from input. */
export class InvoiceLineItemDto {
  @IsEnum(InvoiceItemCategory) category!: InvoiceItemCategory;
  @IsString() description!: string;
  @IsInt() @Min(1) quantity!: number;
  @IsNumber() @Min(0) unitPrice!: number;
}

/** Create an invoice, optionally seeded from an encounter's activity. */
export class CreateInvoiceDto {
  @IsString() patientId!: string;
  @IsOptional() @IsString() encounterId?: string;

  @IsArray() @ValidateNested({ each: true }) @Type(() => InvoiceLineItemDto)
  lineItems!: InvoiceLineItemDto[];

  @IsOptional() @IsNumber() @Min(0) discount?: number;
  /** Tax rate as a fraction, e.g. 0.05 for 5%. Applied to (subtotal − discount). */
  @IsOptional() @IsNumber() @Min(0) taxRate?: number;
}

export class RecordPaymentDto {
  @IsNumber() @Min(0.01) amount!: number;
  @IsEnum(PaymentMethod) method!: PaymentMethod;
  @IsOptional() @IsString() reference?: string;
}

export class RefundDto {
  @IsNumber() @Min(0.01) amount!: number;
  @IsOptional() @IsString() reason?: string;
}

export class QueryInvoicesDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit: number = 20;
  @IsOptional() @IsString() patientId?: string;
  @IsOptional() @IsEnum(InvoiceStatus) status?: InvoiceStatus;
}
