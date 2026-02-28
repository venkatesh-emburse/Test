import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SafetyController } from './safety.controller';
import { SafetyService } from './safety.service';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';

import { User } from '../../database/entities/user.entity';
import { Profile } from '../../database/entities/profile.entity';
import { SafetyVerification } from '../../database/entities/safety-verification.entity';
import { SafetyScoreLog } from '../../database/entities/safety-score-log.entity';
import { Report } from '../../database/entities/report.entity';
import { Match } from '../../database/entities/match.entity';
import { Message } from '../../database/entities/message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Profile, SafetyVerification, SafetyScoreLog, Report, Match, Message]),
  ],
  controllers: [SafetyController],
  providers: [SafetyService, AdminApiKeyGuard],
  exports: [SafetyService],
})
export class SafetyModule {}
