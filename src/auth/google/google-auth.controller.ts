import { Controller, Get, Query, Res, BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from '../auth.service';

@Controller('auth/google')
export class GoogleAuthController {
  constructor(private readonly authService: AuthService) {}

  /** STEP 1 — Redirect user to Google */
  @Public()
  @Throttle({ short: { limit: 5, ttl: 60 } })
  @Get()
  async redirectToGoogle(@Res() res: Response) {
    const url = this.authService.getGoogleAuthUrl();
    return res.redirect(url);
  }

  /** STEP 2 — Google sends user back here */
  @Public()
  @Get('callback')
  async googleCallback(@Query('code') code: string) {
    if (!code) {
      throw new BadRequestException('Missing Google authorization code.');
    }

    return this.authService.handleGoogleCallback(code);
  }
}
