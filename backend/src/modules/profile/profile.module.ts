import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { SafetyModule } from '../safety/safety.module';

import { User } from '../../database/entities/user.entity';
import { Profile } from '../../database/entities/profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Profile]), SafetyModule],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
