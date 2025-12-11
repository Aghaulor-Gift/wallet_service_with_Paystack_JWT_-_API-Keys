import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  ArrayNotEmpty,
  IsIn,
} from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({
    example: 'wallet-service',
    description: 'A name to identify this API key',
  })
  @IsString()
  name: string;

  @ApiProperty({
    isArray: true,
    example: ['deposit', 'transfer', 'read'],
    description: 'Permissions for the API key',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsIn(['deposit', 'transfer', 'read'], { each: true })
  permissions: string[];

  @ApiProperty({
    example: '1D',
    description: 'Expiry duration (1H, 1D, 1M, 1Y)',
  })
  @IsString()
  @IsIn(['1H', '1D', '1M', '1Y'])
  expiry: string;
}
