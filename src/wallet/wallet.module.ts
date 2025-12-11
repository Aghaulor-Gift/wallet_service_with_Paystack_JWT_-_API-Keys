import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PaystackModule } from '../paystack/paystack.module';
import { PaystackWebhookController } from './paystack-webhook.controller';
import { JwtModule } from '@nestjs/jwt'; // <--- 🔑 Import the JwtModule
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
  imports: [PrismaModule, PaystackModule, ApiKeysModule, JwtModule],
  controllers: [WalletController, PaystackWebhookController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
