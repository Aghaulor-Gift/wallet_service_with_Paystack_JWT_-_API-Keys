import { Controller, Post, Get, Body, Req, Query, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiSecurity, ApiBody, ApiResponse } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { DepositDto } from './dto/deposit.dto';
import { TransferDto } from './dto/transfer.dto';
import { StatusQueryDto } from './dto/status-query.dto';
import { AuthUnionGuard } from '../common/guards/auth-union.guard';
import { Permissions } from '../common/decorators/permissions.decorator';  


@ApiTags('Wallet')
@UseGuards(AuthUnionGuard) 
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('deposit')
  @Permissions('deposit')
  @Throttle({ short: { limit: 10, ttl: 60 } })
  @ApiSecurity('JWT-Auth')
  @ApiSecurity('ApiKey-Auth') 
  @ApiBody({ type: DepositDto })
  @ApiResponse({ status: 200, description: 'Paystack initiation successful.' })
  startDeposit(@Req() req, @Body() dto: DepositDto) {
    
    return this.walletService.startDeposit(req.user.id, dto.amount);
  }

  // ---  Paystack Webhook
  @Post('paystack/webhook')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 60, ttl: 60 } })
  async handleWebhook(@Req() req: any) {
    const rawBody = req.rawBody; 
    const signature = req.headers['x-paystack-signature'] as string;

    // The service must verify the signature against rawBody, then parse it.
    return this.walletService.processPaystackWebhook(rawBody, signature);
  }

  // --- 3. Wallet Transfer 
  @Post('transfer')
  @Permissions('transfer')
  @Throttle({ short: { limit: 5, ttl: 60 } })
  @ApiSecurity('JWT-Auth')
  @ApiSecurity('ApiKey-Auth')
  @ApiBody({ type: TransferDto })
  @ApiResponse({ status: 200, description: 'Transfer completed.' })
  transfer(@Req() req, @Body() dto: TransferDto) {
    
    return this.walletService.transfer(req.user.id, dto.wallet_number, dto.amount);
  }

  // --- 4. Get Wallet Balance --
  @Get('balance')
  @Permissions('read')
  @Throttle({ short: { limit: 20, ttl: 60 } })
  @ApiSecurity('JWT-Auth')
  @ApiSecurity('ApiKey-Auth')
  @ApiResponse({ status: 200, description: 'Current wallet balance.' })
  getBalance(@Req() req) {

    return this.walletService.getBalance(req.user.id);
  }

  // --- 5. Transaction History
  @Get('transactions')
  @Permissions('read') 
  @Throttle({ short: { limit: 20, ttl: 60 } })
  @ApiSecurity('JWT-Auth')
  @ApiSecurity('ApiKey-Auth')
  @ApiResponse({ status: 200, description: 'List of transactions.' })
  getTransactions(@Req() req, @Query() query: StatusQueryDto) {
    
    return this.walletService.getTransactions(req.user.id, query.status);
  }
}