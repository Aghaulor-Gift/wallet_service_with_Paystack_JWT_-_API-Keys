import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (field: string, ctx: ExecutionContext) => {
    const auth = ctx.switchToHttp().getRequest()['auth'];
    if (!auth) return null;

    // Normalize fields
    const normalized = {
      id: auth.userId,      
      userId: auth.userId,
      email: auth.email,
      type: auth.type,
      permissions: auth.permissions,
    };

    return field ? normalized[field] : normalized;
  },
);
