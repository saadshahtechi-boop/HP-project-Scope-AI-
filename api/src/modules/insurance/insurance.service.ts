import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ClaimStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClaimDto, ResolveClaimDto, QueryClaimsDto } from './dto/insurance.dto';
import { canTransition, nextStates } from './claim-state';

@Injectable()
export class InsuranceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Draft a claim against an invoice + policy. */
  async create(dto: CreateClaimDto) {
    const [invoice, policy] = await Promise.all([
      this.prisma.invoice.findFirst({ where: { id: dto.invoiceId, deletedAt: null } }),
      this.prisma.insurancePolicy.findUnique({ where: { id: dto.policyId } }),
    ]);
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (!policy) throw new NotFoundException('Insurance policy not found');
    if (dto.claimedAmount > Number(invoice.total)) {
      throw new BadRequestException('Claimed amount cannot exceed the invoice total');
    }

    return this.prisma.insuranceClaim.create({
      data: {
        invoiceId: dto.invoiceId,
        policyId: dto.policyId,
        claimedAmount: new Prisma.Decimal(dto.claimedAmount),
        status: 'DRAFT',
      },
    });
  }

  async findMany(query: QueryClaimsDto) {
    const { page, limit, status } = query;
    const where: Prisma.InsuranceClaimWhereInput = { ...(status ? { status } : {}) };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.insuranceClaim.count({ where }),
      this.prisma.insuranceClaim.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          invoice: { select: { number: true, total: true, patient: { select: { firstName: true, lastName: true, mrn: true } } } },
          policy: { select: { provider: true, policyNumber: true } },
        },
      }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /** Submit a drafted claim to the payer. */
  async submit(id: string) {
    const claim = await this.getClaim(id);
    if (!canTransition(claim.status, 'SUBMITTED')) {
      throw new BadRequestException(`Cannot submit a ${claim.status} claim`);
    }
    return this.prisma.insuranceClaim.update({
      where: { id }, data: { status: 'SUBMITTED', submittedAt: new Date() },
    });
  }

  /** Resolve a claim (approve / partially approve / deny), with guard + amount rules. */
  async resolve(id: string, dto: ResolveClaimDto) {
    const claim = await this.getClaim(id);
    if (!canTransition(claim.status, dto.status)) {
      throw new BadRequestException(
        `Cannot move claim from ${claim.status} to ${dto.status}. Allowed: ${nextStates(claim.status).join(', ') || 'none'}`,
      );
    }
    if (dto.status === 'PARTIALLY_APPROVED' && (dto.approvedAmount == null || dto.approvedAmount <= 0)) {
      throw new BadRequestException('Partial approval requires an approvedAmount');
    }
    const approvedAmount = dto.status === 'APPROVED'
      ? Number(claim.claimedAmount)
      : dto.status === 'PARTIALLY_APPROVED' ? dto.approvedAmount!
      : dto.status === 'DENIED' ? 0
      : undefined;

    return this.prisma.insuranceClaim.update({
      where: { id },
      data: {
        status: dto.status,
        approvedAmount: approvedAmount != null ? new Prisma.Decimal(approvedAmount) : undefined,
        resolvedAt: new Date(),
      },
    });
  }

  /** Mark an approved claim as paid. */
  async markPaid(id: string) {
    const claim = await this.getClaim(id);
    if (!canTransition(claim.status, 'PAID')) {
      throw new BadRequestException(`Cannot mark a ${claim.status} claim as paid`);
    }
    return this.prisma.insuranceClaim.update({ where: { id }, data: { status: 'PAID' } });
  }

  private async getClaim(id: string) {
    const claim = await this.prisma.insuranceClaim.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException('Claim not found');
    return claim;
  }
}
