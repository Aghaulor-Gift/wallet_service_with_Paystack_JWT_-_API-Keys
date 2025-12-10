import { Controller, Post, Get, Body, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // Deposit
  @Post('deposit')
  @Throttle({
    short: { limit: 10, ttl: 60 }
  })
  startDeposit(@Req() req, @Body() body) {
    return this.walletService.startDeposit(req.auth.userId, body.amount);
  }

  // Webhook
	@Post('paystack/webhook')
	@Throttle({
    short: { limit: 60, ttl: 60 } // allow many webhook calls safely
  })
	async handleWebhook(
			@Req() req: Request,
		) {
			const signature = req.headers['x-paystack-signature'] as string;
			const payload = req.body;

			return this.walletService.processPaystackWebhook(payload, signature);
		}


  // Transfer
  @Post('transfer')
  @Throttle({
    short: { limit: 5, ttl: 60 }
  })
  transfer(@Req() req, @Body() dto) {
    return this.walletService.transfer(req.auth.userId, dto.wallet_number, dto.amount);
  }

  // Balance
  @Get('balance')
  @Throttle({
    short: { limit: 20, ttl: 60 }
  })
  getBalance(@Req() req) {
    return this.walletService.getBalance(req.auth.userId);
  }

  // Transactions
  @Get('transactions')
  @Throttle({
    short: { limit: 20, ttl: 60 }
  })
  getTxs(@Req() req) {
    return this.walletService.getTransactions(req.auth.userId);
  }
}
