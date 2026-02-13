import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateTipPoolMemberDto {
  @ApiProperty({ example: 1, description: 'Tip Pool ID' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  tipPoolId: number;

  @ApiProperty({ example: 1, description: 'Collaborator ID' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  collaboratorId: number;

  @ApiProperty({ example: 'waiter', description: 'Role of the member' })
  @IsNotEmpty()
  @IsString()
  role: string;

  @ApiProperty({ example: 10.5, description: 'Weight or points for distribution' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weight: number;
}
