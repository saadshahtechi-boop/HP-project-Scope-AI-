import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { PatientsModule } from './modules/patients/patients.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { QueueModule } from './modules/queue/queue.module';
import { ConsultationsModule } from './modules/consultations/consultations.module';
import { BillingModule } from './modules/billing/billing.module';
import { LaboratoryModule } from './modules/laboratory/laboratory.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PharmacyModule } from './modules/pharmacy/pharmacy.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AiModule } from './modules/ai/ai.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { InsuranceModule } from './modules/insurance/insurance.module';
import { HealthModule } from './modules/health/health.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    AuthModule,
    PatientsModule,
    AppointmentsModule,
    QueueModule,
    ConsultationsModule,
    BillingModule,
    LaboratoryModule,
    InventoryModule,
    PharmacyModule,
    ReportsModule,
    AiModule,
    NotificationsModule,
    InsuranceModule,
    HealthModule,
  ],
  providers: [
    // Order matters: authenticate first, then authorize by role.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
