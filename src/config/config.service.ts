import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private readonly config: NestConfigService) {}

  // GOOGLE AUTH
  get googleClientId(): string {
    return this.config.get<string>('GOOGLE_CLIENT_ID')  ?? '';
  }

  get googleClientSecret(): string {
    return this.config.get<string>('GOOGLE_CLIENT_SECRET')  ?? '';
  }

  get googleRedirectUri(): string {
    return this.config.get<string>('GOOGLE_REDIRECT_URI') ?? '';
  }

  // JWT
  get jwtSecret(): string {
    return this.config.get<string>('JWT_SECRET')  ?? '';
  }

  get jwtExpiry(): string {
    return this.config.get<string>('JWT_EXPIRY') ?? '1d';
  }

  // PAYSTACK
  get paystackSecret(): string {
    return this.config.get<string>('PAYSTACK_SECRET_KEY') ?? '';
  }

  get paystackPublic(): string {
    return this.config.get<string>('PAYSTACK_PUBLIC_KEY')  ?? '';
  }

  // DATABASE URL
  get databaseUrl(): string {
    return this.config.get<string>('DATABASE_URL') ?? '';
  }
}
