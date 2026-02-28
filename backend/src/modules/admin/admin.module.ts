import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { AdminRoleGuard } from './guards/admin-role.guard';

import { AdminUser } from '../../database/entities/admin-user.entity';
import { User } from '../../database/entities/user.entity';
import { Profile } from '../../database/entities/profile.entity';
import { SafetyVerification } from '../../database/entities/safety-verification.entity';
import { SafetyScoreLog } from '../../database/entities/safety-score-log.entity';
import { Report } from '../../database/entities/report.entity';
import { Match } from '../../database/entities/match.entity';

import { SafetyModule } from '../safety/safety.module';
import { FeedbackModule } from '../feedback/feedback.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminUser,
      User,
      Profile,
      SafetyVerification,
      SafetyScoreLog,
      Report,
      Match,
    ]),
    PassportModule.register({ defaultStrategy: 'admin-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('adminJwt.secret'),
        signOptions: {
          expiresIn: configService.get('adminJwt.expiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
    SafetyModule,
    FeedbackModule,
  ],
  controllers: [AdminAuthController, AdminController],
  providers: [
    AdminAuthService,
    AdminService,
    AdminJwtStrategy,
    AdminJwtAuthGuard,
    AdminRoleGuard,
  ],
})
export class AdminModule {}
