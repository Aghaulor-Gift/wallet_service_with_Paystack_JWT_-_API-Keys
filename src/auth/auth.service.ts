import axios from 'axios';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** STEP 1 — Generate Google OAuth URL */
  getGoogleAuthUrl(): string {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI');

    const params = new URLSearchParams({
      client_id: clientId!,
      redirect_uri: redirectUri!,
      response_type: 'code',
      scope: 'openid profile email',
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /** STEP 2 — Handle Google callback */
  async handleGoogleCallback(code: string) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI');

    // 1️⃣ Exchange auth code for access token
    const tokenResponse = await axios.post(
      `https://oauth2.googleapis.com/token`,
      {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      },
      { headers: { 'Content-Type': 'application/json' } },
    );

    const { access_token, id_token } = tokenResponse.data;

    if (!access_token) {
      throw new UnauthorizedException('Failed to exchange Google OAuth token.');
    }

    // 2️⃣ Fetch Google account profile
    const userInfo = await axios.get(
      `https://www.googleapis.com/oauth2/v3/userinfo`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      },
    );

    const googleUser = userInfo.data;

    // 3️⃣ Upsert user in DB (professional approach)
    const user = await this.usersService.upsertGoogleUser({
      googleId: googleUser.sub,
      email: googleUser.email,
      name: googleUser.name,
    });

    // 4️⃣ Create our JWT
    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return { user, token };
  }
}
