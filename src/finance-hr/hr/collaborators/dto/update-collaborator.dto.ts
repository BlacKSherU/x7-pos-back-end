import { IsString, IsNumber, IsEnum, IsOptional, IsPositive, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShiftRole } from '../constants/shift-role.enum';
import { CollaboratorStatus } from '../constants/collaborator-status.enum';

export class UpdateCollaboratorDto {
    @ApiPropertyOptional({ example: 1, description: 'User ID associated with the Collaborator' })
    @IsOptional()
    @IsNumber()
    @IsPositive()
    user_id?: number;

    @ApiPropertyOptional({ example: 'Juan Pérez', description: 'Name of the Collaborator (1-150 characters)' })
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(150)
    name?: string;

    @ApiPropertyOptional({ 
        example: ShiftRole.WAITER, 
        enum: ShiftRole,
        description: 'Role of the Collaborator' 
    })
    @IsOptional()
    @IsEnum(ShiftRole)
    role?: ShiftRole;

    @ApiPropertyOptional({ 
        example: CollaboratorStatus.ACTIVE, 
        enum: CollaboratorStatus,
        description: 'Status of the Collaborator' 
    })
    @IsOptional()
    @IsEnum(CollaboratorStatus)
    status?: CollaboratorStatus;
}

