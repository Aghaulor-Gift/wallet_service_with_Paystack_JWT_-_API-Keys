import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PaystackModule } from '../paystack/paystack.module';
import { PaystackWebhookController } from './paystack-webhook.controller';

@Module({
  imports: [PrismaModule, PaystackModule],
  controllers: [WalletController, PaystackWebhookController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
