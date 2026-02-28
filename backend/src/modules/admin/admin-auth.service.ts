import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { AdminUser } from '../../database/entities/admin-user.entity';
import { AdminRole } from '../../database/entities/enums';
import { AdminLoginDto, AdminSeedDto, ChangePasswordDto } from './dto/admin-login.dto';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(AdminUser)
    private adminRepository: Repository<AdminUser>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async seed(dto: AdminSeedDto) {
    const existingAdmin = await this.adminRepository.findOne({
      where: {},
    });

    if (existingAdmin) {
      throw new ConflictException(
        'An admin user already exists. Seed is only allowed when no admins exist.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const admin = this.adminRepository.create({
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      name: dto.name,
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
    });

    await this.adminRepository.save(admin);

    return {
      success: true,
      message: 'Super admin created successfully',
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    };
  }

  async login(dto: AdminLoginDto) {
    const admin = await this.adminRepository.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login
    await this.adminRepository.update(admin.id, { lastLoginAt: new Date() });

    const token = this.generateToken(admin);

    return {
      accessToken: token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    };
  }

  async getMe(adminId: string) {
    const admin = await this.adminRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      isActive: admin.isActive,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
    };
  }

  async changePassword(adminId: string, dto: ChangePasswordDto) {
    const admin = await this.adminRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    const isCurrentValid = await bcrypt.compare(
      dto.currentPassword,
      admin.passwordHash,
    );

    if (!isCurrentValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await this.adminRepository.update(adminId, { passwordHash: newHash });

    return { success: true, message: 'Password changed successfully' };
  }

  private generateToken(admin: AdminUser): string {
    const payload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      type: 'admin',
    };

    const expiresIn = this.configService.get<string>('adminJwt.expiresIn') || '8h';
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('adminJwt.secret'),
      expiresIn: expiresIn as any,
    });
  }
}
