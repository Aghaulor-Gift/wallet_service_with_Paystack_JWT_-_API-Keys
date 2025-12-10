import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class DepositDto {
  @ApiProperty({
    description: 'Amount in Kobo (100 Kobo = 1 Naira)',
    example: 5000,
  })
  @IsInt()
  @Min(1)
  amount: number;
}
