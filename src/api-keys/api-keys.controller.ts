import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RolloverApiKeyDto } from './dto/rollover-api-key.dto';
import { AuthUnionGuard } from '../common/guards/auth-union.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('keys')
@UseGuards(AuthUnionGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post('create')
  @Throttle({ short: { limit: 10, ttl: 60 } })
  create(@Body() dto: CreateApiKeyDto, @CurrentUser('id') userId: string) {
    return this.apiKeysService.createKey(userId, dto);
  }

  @Post('rollover')
  @Throttle({ short: { limit: 10, ttl: 60 } })
  rollover(@Body() dto: RolloverApiKeyDto, @CurrentUser('id') userId: string) {
    return this.apiKeysService.rolloverKey(userId, dto);
  }
}
