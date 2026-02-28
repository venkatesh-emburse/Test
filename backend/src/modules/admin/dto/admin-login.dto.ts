import { IsEmail, IsString, MinLength, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminRole } from '../../../database/entities/enums';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@liveconnect.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class AdminSeedDto {
  @ApiProperty({ example: 'admin@liveconnect.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Super Admin' })
  @IsString()
  @MinLength(2)
  name: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class CreateAdminDto {
  @ApiProperty({ example: 'newadmin@liveconnect.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'New Admin' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ enum: AdminRole, example: AdminRole.ADMIN })
  @IsEnum(AdminRole)
  role: AdminRole;
}

export class UpdateAdminDto {
  @ApiPropertyOptional({ example: 'Updated Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: AdminRole })
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: boolean;
}

export class ReviewReportDto {
  @ApiProperty({ example: 'Warning issued to user' })
  @IsString()
  actionTaken: string;

  @ApiPropertyOptional({ example: 'User was harassing others via chat' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAppUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  isBanned?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  isSuspended?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  isVerified?: boolean;
}

export class AdjustScoreDto {
  @ApiProperty({ example: -10 })
  @IsNumber()
  @Min(-50)
  @Max(50)
  amount: number;

  @ApiProperty({ example: 'Manual penalty for policy violation' })
  @IsString()
  @MinLength(3)
  reason: string;
}
