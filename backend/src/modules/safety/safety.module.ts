import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SafetyController } from './safety.controller';
import { SafetyService } from './safety.service';

import { User } from '../../database/entities/user.entity';
import { Profile } from '../../database/entities/profile.entity';
import { SafetyVerification } from '../../database/entities/safety-verification.entity';
import { Report } from '../../database/entities/report.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Profile, SafetyVerification, Report]),
    ],
    controllers: [SafetyController],
    providers: [SafetyService],
    exports: [SafetyService],
})
export class SafetyModule { }
