import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { TransactionStatus } from '@prisma/client'; // Assuming this is your Prisma enum

export class StatusQueryDto {
  @ApiPropertyOptional({
    description: 'Filter transactions by status',
    enum: TransactionStatus, // Correctly documents the allowed values
    example: 'SUCCESS',
    required: false,
  })
  @IsEnum(TransactionStatus) // Validation: ensures value is one of the enum members
  @IsOptional() // Validation: allows the parameter to be omitted
  status?: TransactionStatus; // Property is optional and correctly typed
}