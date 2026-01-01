import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PremiumController } from './premium.controller';
import { PremiumService } from './premium.service';

import { User } from '../../database/entities/user.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { FeatureConfig } from '../../database/entities/feature-config.entity';

@Module({
    imports: [TypeOrmModule.forFeature([User, Subscription, FeatureConfig])],
    controllers: [PremiumController],
    providers: [PremiumService],
    exports: [PremiumService],
})
export class PremiumModule { }
