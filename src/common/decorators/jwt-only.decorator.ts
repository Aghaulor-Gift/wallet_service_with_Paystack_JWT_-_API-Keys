import { SetMetadata } from '@nestjs/common';

export const JwtOnly = () => SetMetadata('jwtOnly', true);