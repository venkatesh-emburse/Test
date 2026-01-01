import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

import { User } from '../../database/entities/user.entity';
import { Profile } from '../../database/entities/profile.entity';

@Module({
    imports: [TypeOrmModule.forFeature([User, Profile])],
    controllers: [ProfileController],
    providers: [ProfileService],
    exports: [ProfileService],
})
export class ProfileModule { }
