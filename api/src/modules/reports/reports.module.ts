import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService], // reused by the AI Assistant's NL analytics
})
export class ReportsModule {}
