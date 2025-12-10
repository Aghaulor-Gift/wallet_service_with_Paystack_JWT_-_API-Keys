import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class TransferDto {
  @ApiProperty({
    description: 'Recipient wallet number',
    example: '4566678954356',
  })
  @IsString()
  wallet_number: string;

  @ApiProperty({
    description: 'Amount to transfer (in Kobo)',
    example: 3000,
  })
  @IsInt()
  @Min(1)
  amount: number;
}
