import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { WalletService } from './wallet.service';

@Controller('wallet/paystack')
export class PaystackWebhookController {
  constructor(private readonly walletService: WalletService) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
    console.log('[Webhook Received]', JSON.stringify(payload));

    try {
      await this.walletService.processPaystackWebhook(payload, signature);
      console.log('[Webhook Success]', payload.event);
    } catch (err) {
      console.error('[Webhook Error]', err.message);
      throw err;
    }

    return { status: true };
  }
}
