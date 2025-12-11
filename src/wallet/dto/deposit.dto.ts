import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer'; // 1. IMPORT Type

export class DepositDto {
  @ApiProperty({
    description: 'Amount in Kobo (100 Kobo = 1 Naira)',
    example: 5000,
  })
  @Type(() => Number) // 2. CRITICAL: Add the Type transformer
  @IsInt({ message: 'Amount must be an integer number' })
  @Min(1, { message: 'Amount must not be less than 1' })
  amount: number;
}