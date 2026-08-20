import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { UpdateBusinessSettingsDto } from './dto/settings.dto';

@Injectable()
export class AdminSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  get() {
    return this.prisma.businessSettings.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
  }

  update(dto: UpdateBusinessSettingsDto) {
    return this.prisma.businessSettings.upsert({
      where: { id: 1 },
      create: { id: 1, ...dto },
      update: dto,
    });
  }
}
