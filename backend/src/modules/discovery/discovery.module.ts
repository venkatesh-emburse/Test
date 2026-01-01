import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';

import { User } from '../../database/entities/user.entity';
import { Profile } from '../../database/entities/profile.entity';
import { Swipe } from '../../database/entities/swipe.entity';
import { Match } from '../../database/entities/match.entity';

@Module({
    imports: [TypeOrmModule.forFeature([User, Profile, Swipe, Match])],
    controllers: [DiscoveryController],
    providers: [DiscoveryService],
    exports: [DiscoveryService],
})
export class DiscoveryModule { }
