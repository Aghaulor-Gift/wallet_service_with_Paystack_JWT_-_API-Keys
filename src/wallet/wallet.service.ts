// src/wallet/wallet.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from '../paystack/paystack.service';
import { TransactionStatus, TransactionType } from '@prisma/client';
// 🚫 Removed: import { CreateKeyDto, ExpiryDuration } from '../dtos/keys.dto'; 
// 🚫 Removed: import * as crypto from 'crypto';
// 🚫 Removed: private readonly MAX_ACTIVE_KEYS = 5;

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystack: PaystackService,
  ) {}

  // 🚫 Removed: API KEY MANAGEMENT methods (createApiKey, rolloverApiKey) 
  // --- CORE WALLET OPERATIONS ---

  /** Start a deposit flow */
  async startDeposit(userId: string, amount: number) {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.ensureWallet(userId);

    const { reference, authorization_url } =
      await this.paystack.initializeTransaction({
        amount,
        email: user.email,
      });

    await this.prisma.transaction.create({
      data: {
        userId,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PENDING,
        amount,
        reference,
      },
    });

    return { reference, authorization_url };
  }

  /** Handle Paystack webhook */
  async processPaystackWebhook(rawBody: Buffer, signature: string) {
    if (!signature) {
      throw new BadRequestException('Missing Paystack signature header');
    }
    
    this.paystack.verifyWebhookSignature(rawBody, signature);

    const payload = JSON.parse(rawBody.toString('utf8'));
    const event = payload.event;

    if (event !== 'charge.success' && event !== 'charge.failed') {
      return { received: true }; 
    }

    const data = payload.data;
    const reference: string = data.reference;

    if (!reference) {
      throw new BadRequestException('Missing reference in webhook payload');
    }

    const txn = await this.prisma.transaction.findUnique({
      where: { reference },
    });

    if (!txn) throw new NotFoundException('Transaction not found');

    if (txn.status === TransactionStatus.SUCCESS) {
      return { received: true, message: 'Already processed' }; 
    }

    const paystackAmount = data.amount; 
    if (typeof paystackAmount === 'number' && paystackAmount !== txn.amount) {
      throw new BadRequestException('Amount mismatch for transaction');
    }

    const newStatus =
      event === 'charge.success'
        ? TransactionStatus.SUCCESS
        : TransactionStatus.FAILED;

    const paidAt =
      data.paid_at && !isNaN(Date.parse(data.paid_at))
        ? new Date(data.paid_at)
        : new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: txn.id },
        data: { status: newStatus, paidAt },
      });

      if (newStatus === TransactionStatus.SUCCESS) {
        const wallet = await tx.wallet.findUnique({
          where: { userId: txn.userId },
        });

        if (!wallet) throw new NotFoundException('Wallet not found');

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: txn.amount } },
        });
      }
    });

    return { received: true, status: newStatus };
  }

  /** Check deposit status */
  async getDepositStatus(reference: string) {
    if (!reference) throw new BadRequestException('Reference is required');

    const txn = await this.prisma.transaction.findUnique({
      where: { reference },
    });

    if (!txn) throw new NotFoundException('Transaction not found');

    return {
      reference: txn.reference,
      status: txn.status,
      amount: txn.amount,
      paid_at: txn.paidAt,
    };
  }

  async getBalance(userId: string) {
    const wallet = await this.ensureWallet(userId);
    return { balance: wallet.balance };
  }

  /** Transfer funds internally */
  async transfer(
    senderUserId: string,
    receiverWalletNumber: string,
    amount: number,
  ) {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      const senderWallet = await tx.wallet.findUnique({
        where: { userId: senderUserId },
      });
      if (!senderWallet) throw new NotFoundException('Sender wallet not found');

      if (senderWallet.balance < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      const receiverWallet = await tx.wallet.findUnique({
        where: { walletNumber: receiverWalletNumber },
      });
      if (!receiverWallet)
        throw new NotFoundException('Recipient wallet not found');

      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: amount } },
      });

      await tx.wallet.update({
        where: { id: receiverWallet.id },
        data: { balance: { increment: amount } },
      });

      await tx.transaction.create({
        data: {
          userId: senderUserId,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.SUCCESS,
          amount,
          senderWalletId: senderWallet.id,
          receiverWalletId: receiverWallet.id,
        },
      });

      return { status: 'success', message: 'Transfer completed' };
    });
  }

  /** Get transactions with optional status filter */
  async getTransactions(userId: string, status?: string) {
    let prismaStatus: TransactionStatus | undefined = undefined;

    if (status) {
      const upper = status.toUpperCase();

      if (!Object.values(TransactionStatus).includes(upper as TransactionStatus)) {
        throw new BadRequestException(
          `Invalid status. Must be one of: ${Object.values(TransactionStatus).join(', ')}`
        );
      }

      prismaStatus = upper as TransactionStatus;
    }

    const txns = await this.prisma.transaction.findMany({
      where: {
        userId,
        ...(prismaStatus ? { status: prismaStatus } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return txns.map((t) => ({
      type: t.type.toLowerCase(),
      amount: t.amount,
      status: t.status.toLowerCase(),
      reference: t.reference,
      createdAt: t.createdAt,
    }));
  }

  /** Create wallet if not exists */
  private async ensureWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({ where: { userId } });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: {
          userId,
          walletNumber: this.generateWalletNumber(),
        },
      });
    }

    return wallet;
  }

  private generateWalletNumber(): string {
    return (
      '4' +
      Math.floor(100000000000 + Math.random() * 899999999999).toString()
    );
  }
}