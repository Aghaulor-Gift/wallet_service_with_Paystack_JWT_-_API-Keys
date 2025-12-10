import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
  GatewayTimeoutException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class PaystackService {
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(private readonly config: ConfigService) {
    const sk = this.config.get<string>('PAYSTACK_SECRET_KEY');
    if (!sk) throw new Error('Missing PAYSTACK_SECRET_KEY');
    this.secretKey = sk;
  }

  /** Initialize payment */
  async initializeTransaction({
    amount,
    email,
  }: {
    amount: number;
    email: string;
  }) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        { amount, email },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 8000,
        },
      );

      if (!response.data?.status) {
        throw new BadRequestException('Paystack rejected the transaction request.');
      }

      const { reference, authorization_url } = response.data.data;

      if (!reference || !authorization_url) {
        throw new InternalServerErrorException(
          'Paystack returned incomplete transaction data.',
        );
      }

      return { reference, authorization_url };
    } catch (err) {
      const error = err as AxiosError;

      // TIMEOUT
      if (error.code === 'ECONNABORTED') {
        throw new GatewayTimeoutException('Request to Paystack timed out.');
      }

      // DNS FAILURE
      if (error.code === 'ENOTFOUND') {
        throw new ServiceUnavailableException('Unable to reach Paystack (DNS error).');
      }

      // INVALID KEY
      if (error.response?.status === 401) {
        throw new UnauthorizedException(
          'Paystack rejected authentication. Check your SECRET KEY.',
        );
      }

      // PAYSTACK DOWN (5xx)
      const status = error.response?.status ?? 0;

      if (status >= 500) {
        throw new ServiceUnavailableException(
          'Paystack servers are currently unavailable.',
        );
      }

      // CLIENT ERRORS (4xx)
      if (status >= 400) {
        throw new BadRequestException(
          (error.response?.data as any)?.message ?? 'Paystack request failed.',
        );
      }

      throw new Error('Unknown Paystack error');
    } // ✅ FIX: this closing brace was missing
  }

  /** Validate Paystack webhook signature */
  verifyWebhookSignature(payload: any, signature?: string) {
    if (!signature) {
      throw new UnauthorizedException('Missing Paystack signature.');
    }

    const computed = crypto
      .createHmac('sha512', this.secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (computed !== signature) {
      throw new UnauthorizedException('Invalid Paystack webhook signature.');
    }
  }

  /** Verify Paystack transaction */
  async verifyTransaction(reference: string) {
    try {
      const res = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: { Authorization: `Bearer ${this.secretKey}` },
          timeout: 7000,
        },
      );

      return res.data;
    } catch (error) {
      throw new ServiceUnavailableException(
        'Unable to verify transaction with Paystack.',
      );
    }
  }
}
