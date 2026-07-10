import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryNotificationsDto } from './dto/notifications.dto';

/**
 * Read/manage surface for notifications. The write side already exists — other
 * modules (e.g. Laboratory on result entry) create notification rows. Everything
 * here is scoped to the authenticated user so no one sees another user's feed.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: QueryNotificationsDto) {
    const { page, limit, unreadOnly } = query;
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(unreadOnly ? { status: 'UNREAD' } : {}),
    };

    const [total, data, unread] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId, status: 'UNREAD' } }),
    ]);

    return {
      data,
      unreadCount: unread,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Lightweight count for the topbar badge. */
  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({ where: { userId, status: 'UNREAD' } });
    return { unreadCount: count };
  }

  /** Mark one notification read — only if it belongs to this user. */
  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) throw new NotFoundException('Notification not found');
    return this.prisma.notification.update({
      where: { id },
      data: { status: 'READ', readAt: new Date() },
    });
  }

  /** Mark all of this user's unread notifications read. */
  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, status: 'UNREAD' },
      data: { status: 'READ', readAt: new Date() },
    });
    return { updated: result.count };
  }
}
