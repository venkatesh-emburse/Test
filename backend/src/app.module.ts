import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { ProfileModule } from './modules/profile/profile.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { MicroDateModule } from './modules/micro-dates/micro-date.module';
import { ChatModule } from './modules/chat/chat.module';
import { SafetyModule } from './modules/safety/safety.module';
import { LocationModule } from './modules/location/location.module';
import { SignalsModule } from './modules/signals/signals.module';
import { PremiumModule } from './modules/premium/premium.module';
import { UploadModule } from './modules/upload/upload.module';

// Entities
import {
  User,
  Profile,
  Swipe,
  Match,
  Message,
  Signal,
  Report,
  SafetyVerification,
  Subscription,
  FeatureConfig,
  OtpCode,
  RefreshToken,
} from './database/entities';

@Module({
  imports: [
    // Configuration Module
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // TypeORM Database Module
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.name'),
        entities: [
          User,
          Profile,
          Swipe,
          Match,
          Message,
          Signal,
          Report,
          SafetyVerification,
          Subscription,
          FeatureConfig,
          OtpCode,
          RefreshToken,
        ],
        synchronize: configService.get('database.synchronize'), // Only for dev!
        logging: configService.get('database.logging'),
      }),
      inject: [ConfigService],
    }),

    // Feature Modules
    AuthModule,
    ProfileModule,
    DiscoveryModule,
    MicroDateModule,
    ChatModule,
    SafetyModule,
    LocationModule,
    SignalsModule,
    PremiumModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
