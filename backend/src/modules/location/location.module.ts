import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LocationController } from './location.controller';
import { LocationService } from './location.service';

import { User } from '../../database/entities/user.entity';
import { Profile } from '../../database/entities/profile.entity';
import { Swipe } from '../../database/entities/swipe.entity';
import { Match } from '../../database/entities/match.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Profile, Swipe, Match])],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
