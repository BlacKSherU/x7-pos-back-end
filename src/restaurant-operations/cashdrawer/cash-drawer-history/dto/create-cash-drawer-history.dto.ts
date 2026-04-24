import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsPositive } from 'class-validator';

export class CreateCashDrawerHistoryDto {
  @ApiProperty({
    example: 1,
    description:
      'Identifier of the Cash Drawer associated with this history record',
  })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  cashDrawerId: number;

  @ApiProperty({
    example: 100.0,
    description: 'Opening balance amount in the cash drawer',
  })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  openingBalance: number;

  @ApiProperty({
    example: 150.5,
    description: 'Closing balance amount in the cash drawer',
  })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  closingBalance: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Collaborator who opened the cash drawer',
  })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  openedBy: number;

  @ApiProperty({
    example: 2,
    description: 'Identifier of the Collaborator who closed the cash drawer',
  })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  closedBy: number;
}
