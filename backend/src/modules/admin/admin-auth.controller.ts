import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto, AdminSeedDto, ChangePasswordDto } from './dto/admin-login.dto';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { CurrentAdmin } from './decorators/current-admin.decorator';

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('seed')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create initial super admin (one-time only)' })
  @ApiResponse({ status: 201, description: 'Super admin created' })
  @ApiResponse({ status: 409, description: 'Admin already exists' })
  async seed(@Body() dto: AdminSeedDto) {
    return this.adminAuthService.seed(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: AdminLoginDto) {
    return this.adminAuthService.login(dto);
  }

  @Get('me')
  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current admin profile' })
  @ApiResponse({ status: 200, description: 'Admin profile' })
  async getMe(@CurrentAdmin('id') adminId: string) {
    return this.adminAuthService.getMe(adminId);
  }

  @Post('change-password')
  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change admin password' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  async changePassword(
    @CurrentAdmin('id') adminId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.adminAuthService.changePassword(adminId, dto);
  }
}
