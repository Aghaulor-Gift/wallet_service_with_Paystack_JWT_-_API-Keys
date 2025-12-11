// src/api-keys/api-keys.service.ts

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { ApiPermission } from '@prisma/client';
import { CreateApiKeyDto } from './dto/create-api-key.dto'; // Use local DTO path


@Injectable()
export class ApiKeysService {
  private readonly MAX_ACTIVE_KEYS = 5;
  
  constructor(private readonly prisma: PrismaService) {}

  private calculateExpiryDate(duration: string): Date {
    const now = new Date();
    const [value, unit] = [parseInt(duration.slice(0, -1)), duration.slice(-1)];

    switch (unit) {
      case 'H': now.setHours(now.getHours() + value); break;
      case 'D': now.setDate(now.getDate() + value); break;
      case 'M': now.setMonth(now.getMonth() + value); break;
      case 'Y': now.setFullYear(now.getFullYear() + value); break;
      default: throw new BadRequestException('Invalid expiry duration unit.');
    }
    return now;
  }

  private generateApiKeyString(): string {
    const prefix = 'sk_live_';
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return prefix + randomBytes;
  }

  // ✅ Method name matches controller
  async createKey(userId: string, dto: CreateApiKeyDto) {
    const activeKeysCount = await this.prisma.apiKey.count({
      where: { userId, revoked: false },
    });

    if (activeKeysCount >= this.MAX_ACTIVE_KEYS) {
      throw new ForbiddenException(
        `Maximum ${this.MAX_ACTIVE_KEYS} active API keys allowed.`,
      );
    }

    const rawKey = this.generateApiKeyString();
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const expiresAt = this.calculateExpiryDate(dto.expiry);

    const apiKeyRecord = await this.prisma.apiKey.create({
      data: {
        userId,
        name: dto.name,
        key: keyHash, 
        permissions: dto.permissions as unknown as ApiPermission[],
        expiresAt,
        revoked: false, 
      },
    });

    return {
      api_key: rawKey,
      expires_at: expiresAt.toISOString(),
      id: apiKeyRecord.id
    };
  }

  // ✅ Method name matches controller and takes 3 arguments
  async rolloverKey(
    userId: string,
    expiredKeyId: string,
    newExpiryDuration: string, // Expects the string, e.g., '1M'
  ) {
    const expiredKey = await this.prisma.apiKey.findUnique({
      where: { id: expiredKeyId, userId },
    });

    if (!expiredKey) {
      throw new NotFoundException('Expired key ID not found.');
    }

    if (expiredKey.expiresAt > new Date()) {
      throw new BadRequestException('Key is not yet expired and cannot be rolled over.');
    }
    
    if (expiredKey.revoked) {
      throw new BadRequestException('Key has been revoked and cannot be rolled over.');
    }
    
    const newRawKey = this.generateApiKeyString();
    const newKeyHash = crypto.createHash('sha256').update(newRawKey).digest('hex');
    const newExpiresAt = this.calculateExpiryDate(newExpiryDuration);

    const newKeyRecord = await this.prisma.$transaction(async (tx) => {
      const newKey = await tx.apiKey.create({
        data: {
          userId,
          name: expiredKey.name + ' (Rollover)',
          key: newKeyHash, 
          permissions: expiredKey.permissions, 
          expiresAt: newExpiresAt,
          revoked: false,
        },
      });

      await tx.apiKey.update({
        where: { id: expiredKeyId },
        data: { revoked: true },
      });

      return newKey;
    });

    return {
      api_key: newRawKey,
      expires_at: newKeyRecord.expiresAt.toISOString(),
      id: newKeyRecord.id
    };
  }

  // ✅ New method implemented to fix TS2339 error
  async revokeKey(userId: string, keyId: string) {
    const key = await this.prisma.apiKey.findUnique({ 
      where: { id: keyId, userId } 
    });

    if (!key) {
      throw new NotFoundException('API Key not found or does not belong to user.');
    }

    if (key.revoked) {
      return { status: 'success', message: 'Key already revoked' };
    }

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { revoked: true },
    });

    return { status: 'success', message: 'API Key revoked.' };
  }

    // 🎯 REQUIRED FIX: Implement the validateKey method for the AuthUnionGuard
    /** * Validates the provided raw API key string against the database hash,
     * checks for expiry, and ensures it is not revoked.
     */
    async validateKey(rawKey: string) {
        // 1. Hash the incoming raw key (SHA-256)
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

        // 2. Find the key record using the HASHED key stored in the 'key' field
        const apiKeyRecord = await this.prisma.apiKey.findUnique({
            where: { key: keyHash },
        });

        if (!apiKeyRecord) {
            return null; // Key hash not found
        }

        // 3. Check status and expiry
        if (apiKeyRecord.revoked || apiKeyRecord.expiresAt < new Date()) {
            return null; 
        }
        
        // 4. Return the necessary user and permission data for the Guard
        return {
            userId: apiKeyRecord.userId,
            // Guard expects permissions as lowercase strings
            permissions: apiKeyRecord.permissions.map(p => p.toLowerCase()),
        };
    }
}