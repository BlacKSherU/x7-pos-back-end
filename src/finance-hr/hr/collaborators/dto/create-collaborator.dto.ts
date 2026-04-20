import { IsString, IsNotEmpty, IsNumber, IsEnum, IsPositive, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ShiftRole } from '../constants/shift-role.enum';
import { CollaboratorStatus } from '../constants/collaborator-status.enum';

export class CreateCollaboratorDto {
    @ApiProperty({ example: 1, description: 'User ID associated with the Collaborator' })
    @IsNumber()
    @IsPositive()
    user_id: number;

    @ApiProperty({ example: 1, description: 'Merchant ID' })
    @IsNumber()
    @IsPositive()
    merchant_id: number;

    @ApiProperty({ example: 'Juan Pérez', description: 'Name of the Collaborator (1-150 characters)' })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(150)
    name: string;

    @ApiProperty({ 
        example: ShiftRole.WAITER, 
        enum: ShiftRole,
        description: 'Role of the Collaborator' 
    })
    @IsEnum(ShiftRole)
    role: ShiftRole;

    @ApiProperty({ 
        example: CollaboratorStatus.ACTIVE, 
        enum: CollaboratorStatus,
        description: 'Status of the Collaborator' 
    })
    @IsEnum(CollaboratorStatus)
    status: CollaboratorStatus;
}

