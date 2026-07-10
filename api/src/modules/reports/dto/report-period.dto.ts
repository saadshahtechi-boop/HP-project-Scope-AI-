import { IsEnum, IsOptional } from 'class-validator';
import { Period } from '../date-range';

const PERIODS: Period[] = ['today', 'week', 'month', 'year'];

export class ReportPeriodDto {
  @IsOptional()
  @IsEnum(PERIODS as unknown as object, { message: 'period must be one of today|week|month|year' })
  period: Period = 'month';
}
