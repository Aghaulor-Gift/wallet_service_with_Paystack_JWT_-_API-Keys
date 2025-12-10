import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async createUser(data: { email: string; name?: string; googleId: string }) {
    return this.prisma.user.create({
      data,
    });
  }

  async upsertGoogleUser(data: { email: string; name?: string; googleId: string }) {
    return this.prisma.user.upsert({
      where: { email: data.email },
      update: {
        name: data.name,
        googleId: data.googleId,
      },
      create: {
        email: data.email,
        name: data.name,
        googleId: data.googleId,
      },
    });
  }
}
