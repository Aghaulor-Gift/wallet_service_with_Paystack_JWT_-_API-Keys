import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (field: string, ctx: ExecutionContext) => {
    const auth = ctx.switchToHttp().getRequest()['auth'];
    return field ? auth?.[field] : auth;
  },
);
