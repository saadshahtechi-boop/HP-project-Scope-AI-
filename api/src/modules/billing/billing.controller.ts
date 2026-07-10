import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { BillingService } from './billing.service';
import {
  CreateInvoiceDto, RecordPaymentDto, RefundDto, QueryInvoicesDto,
} from './dto/billing.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('invoices')
  @Roles(Role.RECEPTIONIST, Role.ADMIN)
  create(@Body() dto: CreateInvoiceDto) {
    return this.billingService.create(dto);
  }

  /** Auto-generate an invoice from a completed encounter's activity. */
  @Post('invoices/from-encounter/:encounterId')
  @Roles(Role.RECEPTIONIST, Role.ADMIN, Role.DOCTOR)
  createFromEncounter(@Param('encounterId') encounterId: string) {
    return this.billingService.createFromEncounter(encounterId);
  }

  @Get('invoices')
  @Roles(Role.RECEPTIONIST, Role.ADMIN, Role.DOCTOR)
  findMany(@Query() query: QueryInvoicesDto) {
    return this.billingService.findMany(query);
  }

  @Get('invoices/outstanding')
  @Roles(Role.RECEPTIONIST, Role.ADMIN)
  outstanding(@Query('patientId') patientId?: string) {
    return this.billingService.outstanding(patientId);
  }

  @Get('invoices/:id')
  @Roles(Role.RECEPTIONIST, Role.ADMIN, Role.DOCTOR)
  findOne(@Param('id') id: string) {
    return this.billingService.findOne(id);
  }

  @Post('invoices/:id/payments')
  @Roles(Role.RECEPTIONIST, Role.ADMIN)
  recordPayment(@Param('id') id: string, @Body() dto: RecordPaymentDto) {
    return this.billingService.recordPayment(id, dto);
  }

  @Post('invoices/:id/refunds')
  @Roles(Role.ADMIN)
  refund(@Param('id') id: string, @Body() dto: RefundDto) {
    return this.billingService.refund(id, dto);
  }
}
