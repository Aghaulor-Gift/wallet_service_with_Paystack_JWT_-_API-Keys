// src/api-keys/api-keys.controller.ts

import { Controller, Post, Body, UseGuards, Delete, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiKeysService } from './api-keys.service'; 
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RolloverApiKeyDto } from './dto/rollover-api-key.dto';
import { AuthUnionGuard } from '../common/guards/auth-union.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiSecurity, ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { JwtOnly } from '../common/decorators/jwt-only.decorator';


@ApiTags('API Keys')
@ApiSecurity('JWT-Auth') 
@ApiBearerAuth('jwt-auth') 
@Controller('keys')
@JwtOnly()
@UseGuards(AuthUnionGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post('create')
  @Throttle({ short: { limit: 10, ttl: 60 } })
  @ApiBody({ type: CreateApiKeyDto })
  @ApiResponse({ status: 201, description: 'API Key created successfully.' })
  create(@Body() dto: CreateApiKeyDto, @CurrentUser('id') userId: string) {
    // 1. Method name matches the controller's expectation: createKey
    return this.apiKeysService.createKey(userId, dto); 
  }

  @Post('rollover')
  @Throttle({ short: { limit: 10, ttl: 60 } })
  @ApiBody({ type: RolloverApiKeyDto })
  @ApiResponse({ status: 200, description: 'API Key successfully rolled over.' })
  rollover(@Body() dto: RolloverApiKeyDto, @CurrentUser('id') userId: string) {
    // 2. Argument count (3) is correct and matches the service method signature below
    return this.apiKeysService.rolloverKey(
      userId, 
      dto.expired_key_id, 
      dto.expiry
    );
  }

  @Delete(':id')
  @Throttle({ short: { limit: 5, ttl: 60 } })
  @ApiResponse({ status: 200, description: 'API Key revoked successfully.' })
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    // 3. Method name matches the service's implementation: revokeKey
    return this.apiKeysService.revokeKey(userId, id); 
  }
}