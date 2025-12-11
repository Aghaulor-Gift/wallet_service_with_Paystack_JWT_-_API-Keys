import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GoogleAuthController } from './google/google-auth.controller';
import { JwtStrategy } from './jwt/jwt.strategy';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';


@Module({
  imports: [
    UsersModule,
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const expiry = config.get<string>('JWT_EXPIRY') ?? '1d';
        return {
          secret: config.get<string>('JWT_SECRET'),
          signOptions: { expiresIn: expiry as unknown as number },
        };
      },
    }),
  ],

  controllers: [GoogleAuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule, PassportModule, JwtStrategy],
})
export class AuthModule {}
