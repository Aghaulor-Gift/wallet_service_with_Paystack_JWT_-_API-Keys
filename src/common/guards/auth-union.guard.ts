import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ApiKeysService } from '../../api-keys/api-keys.service';
import { Request } from 'express';

@Injectable()
export class AuthUnionGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly apiKeysService: ApiKeysService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {

    // ✅ 1. Skip authentication on @Public() routes  
    const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
    if (isPublic) return true;

    const request: Request = context.switchToHttp().getRequest();

    const bearerToken = this.extractBearerToken(request);
    const apiKey = request.headers['x-api-key'] as string;

    if (bearerToken) {
      return this.validateJwt(request, bearerToken);
    }

    if (apiKey) {
      return this.validateApiKey(request, apiKey, context);
    }

    throw new UnauthorizedException('Missing authentication: JWT or API key required.');
  }

  private extractBearerToken(req: Request): string | null {
    const auth = req.headers['authorization'];

    if (auth && auth.startsWith('Bearer ')) {
      return auth.split(' ')[1];
    }
    return null;
  }

  private async validateJwt(req: Request, token: string): Promise<boolean> {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      req['auth'] = {
        type: 'jwt',
        userId: payload.sub,
        email: payload.email,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired JWT token');
    }
  }

  private async validateApiKey(
    req: Request,
    apiKey: string,
    context: ExecutionContext,
  ): Promise<boolean> {
    const key = await this.apiKeysService.validateKey(apiKey);
    if (!key) throw new UnauthorizedException('Invalid or expired API key');

    const requiredPermissions =
      this.reflector.get<string[]>('permissions', context.getHandler()) ||
      this.reflector.get<string[]>('permissions', context.getClass());

    if (requiredPermissions?.length) {
      const keyPermissions = key.permissions.map((p) => p.toLowerCase());
      for (const permission of requiredPermissions) {
        if (!keyPermissions.includes(permission.toLowerCase())) {
          throw new ForbiddenException('Missing required API key permission');
        }
      }
    }

    req['auth'] = {
      type: 'api-key',
      userId: key.userId,
      permissions: key.permissions,
    };

    return true;
  }
}
