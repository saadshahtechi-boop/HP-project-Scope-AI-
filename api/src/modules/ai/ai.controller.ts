import { Body, Controller, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AiService } from './ai.service';
import {
  AnalyticsQueryDto, GenerateSoapDto, SummarizeDto, ReferralDto,
  DischargeDto, FollowUpDto, MedicineSuggestionDto,
} from './dto/ai.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /** Natural-language clinic analytics — e.g. "show revenue this month". */
  @Post('analytics')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST)
  analytics(@Body() dto: AnalyticsQueryDto) {
    return this.aiService.analytics(dto.query);
  }

  @Post('soap')
  @Roles(Role.DOCTOR)
  soap(@Body() dto: GenerateSoapDto) {
    return this.aiService.soap(dto.patientId, dto.complaint);
  }

  @Post('summarize')
  @Roles(Role.DOCTOR, Role.NURSE)
  summarize(@Body() dto: SummarizeDto) {
    return this.aiService.summarize(dto.patientId);
  }

  @Post('referral')
  @Roles(Role.DOCTOR)
  referral(@Body() dto: ReferralDto) {
    return this.aiService.referral(dto.patientId, dto.toSpecialty, dto.reason);
  }

  @Post('discharge')
  @Roles(Role.DOCTOR)
  discharge(@Body() dto: DischargeDto) {
    return this.aiService.discharge(dto.patientId, dto.visitReason);
  }

  @Post('follow-up')
  @Roles(Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST)
  followUp(@Body() dto: FollowUpDto) {
    return this.aiService.followUp(dto.patientId, dto.whenText);
  }

  @Post('medicine-suggestions')
  @Roles(Role.DOCTOR)
  medicines(@Body() dto: MedicineSuggestionDto) {
    return this.aiService.medicines(dto.conditionCodes);
  }
}
