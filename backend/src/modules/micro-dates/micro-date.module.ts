import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MicroDateController } from './micro-date.controller';
import { MicroDateService } from './micro-date.service';

import { Match } from '../../database/entities/match.entity';
import { User } from '../../database/entities/user.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Match, User])],
    controllers: [MicroDateController],
    providers: [MicroDateService],
    exports: [MicroDateService],
})
export class MicroDateModule { }
