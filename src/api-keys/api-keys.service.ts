import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RolloverApiKeyDto } from './dto/rollover-api-key.dto';
import { addExpiryToNow } from '../common/utils/expiry.util';
import { ApiPermission } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  private generateKey(): string {
    // Long, random, unpredictable secret – good enough for this task.
    return 'sk_live_' + randomBytes(32).toString('hex');
  }

  async createKey(userId: string, dto: CreateApiKeyDto) {
    // Enforce max 5 active keys
    const activeCount = await this.prisma.apiKey.count({
      where: { userId, revoked: false, expiresAt: { gt: new Date() } },
    });

    if (activeCount >= 5) {
      throw new ForbiddenException('Maximum of 5 active API keys reached');
    }

    const expiresAt = addExpiryToNow(dto.expiry);

    const key = this.generateKey();

    const permissions = dto.permissions.map(
      (p) => p.toUpperCase() as ApiPermission,
    );

    const apiKey = await this.prisma.apiKey.create({
      data: {
        userId,
        name: dto.name,
        key,
        permissions,
        expiresAt,
      },
    });

    // NOTE: only return the key once – caller should store it securely.
    return {
      api_key: apiKey.key,
      expires_at: apiKey.expiresAt,
    };
  }

  async rolloverKey(userId: string, dto: RolloverApiKeyDto) {
    const oldKey = await this.prisma.apiKey.findFirst({
      where: { id: dto.expired_key_id, userId },
    });

    if (!oldKey) {
      throw new NotFoundException('API key not found');
    }

    // Must truly be expired
    if (!oldKey.expiresAt || oldKey.expiresAt > new Date()) {
      throw new ForbiddenException('Key is not expired');
    }

    const expiresAt = addExpiryToNow(dto.expiry);
    const newKeyValue = this.generateKey();

    const newKey = await this.prisma.apiKey.create({
      data: {
        userId,
        name: oldKey.name,
        key: newKeyValue,
        permissions: oldKey.permissions,
        expiresAt,
      },
    });

    return {
      api_key: newKey.key,
      expires_at: newKey.expiresAt,
    };
  }

  async validateKey(rawKey: string) {
    // For auth usage: if this returns null, guard throws Unauthorized.
    const key = await this.prisma.apiKey.findFirst({
      where: {
        key: rawKey,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    return key;
  }
}
