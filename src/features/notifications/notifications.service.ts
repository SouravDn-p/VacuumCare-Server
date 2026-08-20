import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { UserRole } from '../../../generated/prisma/enums';
import { PrismaService } from '../../database/prisma.service';

export type NotificationPayload = {
  title: string;
  body: string;
  data?: Prisma.InputJsonValue;
};

type NotificationClient = Pick<
  Prisma.TransactionClient,
  'notification' | 'user'
>;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  createForUser(
    userId: string,
    payload: NotificationPayload,
    client: NotificationClient = this.prisma,
  ) {
    return client.notification.create({ data: { userId, ...payload } });
  }

  async createForUsers(
    userIds: string[],
    payload: NotificationPayload,
    client: NotificationClient = this.prisma,
  ) {
    const recipients = [...new Set(userIds)];
    if (!recipients.length) return 0;
    const result = await client.notification.createMany({
      data: recipients.map((userId) => ({ userId, ...payload })),
    });
    return result.count;
  }

  async fanOutToActiveAdmins(
    payload: NotificationPayload,
    client: NotificationClient = this.prisma,
  ) {
    const admins = await client.user.findMany({
      where: { role: UserRole.ADMIN, isActive: true },
      select: { id: true },
    });
    return this.createForUsers(
      admins.map((admin) => admin.id),
      payload,
      client,
    );
  }
}
