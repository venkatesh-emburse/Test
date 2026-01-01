import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SignalsController } from './signals.controller';
import { SignalsService } from './signals.service';

import { User } from '../../database/entities/user.entity';
import { Signal } from '../../database/entities/signal.entity';
import { Match } from '../../database/entities/match.entity';

@Module({
    imports: [TypeOrmModule.forFeature([User, Signal, Match])],
    controllers: [SignalsController],
    providers: [SignalsService],
    exports: [SignalsService],
})
export class SignalsModule { }
