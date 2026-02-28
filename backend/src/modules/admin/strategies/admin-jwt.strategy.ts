import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUser } from '../../../database/entities/admin-user.entity';

interface AdminJwtPayload {
  sub: string;
  email: string;
  role: string;
  type: string;
  iat: number;
  exp: number;
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    private configService: ConfigService,
    @InjectRepository(AdminUser)
    private adminRepository: Repository<AdminUser>,
  ) {
    const secret = configService.get<string>('adminJwt.secret');
    if (!secret) {
      throw new Error('ADMIN_JWT_SECRET is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: AdminJwtPayload) {
    if (payload.type !== 'admin') {
      throw new UnauthorizedException('Invalid token type');
    }

    const admin = await this.adminRepository.findOne({
      where: { id: payload.sub, isActive: true },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin not found or inactive');
    }

    return admin;
  }
}
