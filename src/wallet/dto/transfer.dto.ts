import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer'; // <<< Import this

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
  @Type(() => Number) // <<< CRITICAL FIX: Convert string to number
  @IsInt() 
  @Min(1)
  amount: number;
}