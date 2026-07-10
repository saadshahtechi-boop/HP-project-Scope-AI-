import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { ReportPeriodDto } from './dto/report-period.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /** Live dashboard summary cards. */
  @Get('dashboard')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST)
  dashboard() {
    return this.reportsService.dashboardSummary();
  }

  @Get('revenue/series')
  @Roles(Role.ADMIN, Role.DOCTOR)
  revenueSeries() {
    return this.reportsService.revenueSeries(7);
  }

  @Get('revenue')
  @Roles(Role.ADMIN, Role.DOCTOR)
  revenue(@Query() { period }: ReportPeriodDto) {
    return this.reportsService.revenueForPeriod(period);
  }

  @Get('appointments/series')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST)
  appointmentSeries() {
    return this.reportsService.appointmentSeries(7);
  }

  @Get('diseases')
  @Roles(Role.ADMIN, Role.DOCTOR)
  diseaseStats() {
    return this.reportsService.diseaseStats(8);
  }

  @Get('doctors/performance')
  @Roles(Role.ADMIN)
  doctorPerformance(@Query() { period }: ReportPeriodDto) {
    return this.reportsService.doctorPerformance(period);
  }

  @Get('patients/growth')
  @Roles(Role.ADMIN, Role.DOCTOR)
  patientGrowth() {
    return this.reportsService.patientGrowth(30);
  }

  @Get('appointments/missed')
  @Roles(Role.ADMIN, Role.RECEPTIONIST)
  missed(@Query() { period }: ReportPeriodDto) {
    return this.reportsService.missedAppointments(period);
  }
}
