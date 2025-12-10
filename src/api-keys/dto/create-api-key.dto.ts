import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsString } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'Name of the key for identification',
    example: 'wallet-service',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Permissions assigned to this API key',
    example: ['deposit', 'transfer', 'read'],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsIn(['deposit', 'transfer', 'read'], { each: true })
  permissions: string[];

  @ApiProperty({
    description: 'Expiry duration: 1H, 1D, 1M, 1Y',
    example: '1D',
  })
  @IsString()
  @IsIn(['1H', '1D', '1M', '1Y'])
  expiry: string;
}
