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
    const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
    if (isPublic) return true;

    const request: Request = context.switchToHttp().getRequest();

    const bearerToken = this.extractBearerToken(request);
    const apiKey = request.headers['x-api-key'] as string;

    if (bearerToken) return this.validateJwt(request, bearerToken);
    if (apiKey) return this.validateApiKey(request, apiKey, context);

    throw new UnauthorizedException(
      'Missing authentication: JWT or API key required.',
    );
  }

  private extractBearerToken(req: Request): string | null {
    const auth = req.headers['authorization'];
    if (auth?.startsWith('Bearer ')) return auth.split(' ')[1];
    return null;
  }

  private async validateJwt(req: Request, token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token);

      req['auth'] = {
        type: 'jwt',
        id: payload.sub,
        email: payload.email,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired JWT token');
    }
  }

  private async validateApiKey(req: Request, apiKey: string, context: ExecutionContext) {
    // Check if the route is explicitly marked for JWT only (e.g., key management routes)
    const isJwtOnly =
      this.reflector.get<boolean>('jwtOnly', context.getHandler()) ||
      this.reflector.get<boolean>('jwtOnly', context.getClass());

    if (isJwtOnly) {
      throw new UnauthorizedException('API key is not permitted for this operation. JWT required.');
    }

    // Validate the key hash, expiry, and revocation status
    const key = await this.apiKeysService.validateKey(apiKey);
    if (!key) throw new UnauthorizedException('Invalid or expired API key');

    // Check permissions required by the controller/handler
    const requiredPermissions =
      this.reflector.get<string[]>('permissions', context.getHandler()) ||
      this.reflector.get<string[]>('permissions', context.getClass());

    if (requiredPermissions?.length) {
      const keyPermissions = key.permissions.map((p) => p.toLowerCase());
      for (const permission of requiredPermissions) {
        if (!keyPermissions.includes(permission.toLowerCase())) {
          throw new ForbiddenException('Missing required permission');
        }
      }
    }

    // Inject API key payload into the request
    req['auth'] = {
      type: 'api-key',
      id: key.userId,
      permissions: key.permissions,
    };

    return true;
  }
}