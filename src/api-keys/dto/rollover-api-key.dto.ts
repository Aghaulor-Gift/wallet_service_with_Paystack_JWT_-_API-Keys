import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';

export class RolloverApiKeyDto {
  @ApiProperty({
    description: 'ID of the expired API key to rollover',
    example: 'abc123-key-id',
  })
  @IsString()
  expired_key_id: string;

  @ApiProperty({
    description: 'New expiry duration: 1H, 1D, 1M, 1Y',
    example: '1M',
  })
  @IsString()
  @IsIn(['1H', '1D', '1M', '1Y'])
  expiry: string;
}
