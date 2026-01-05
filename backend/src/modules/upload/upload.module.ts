import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadController } from './upload.controller';
import { CloudinaryService } from './cloudinary.service';

@Module({
    imports: [ConfigModule],
    controllers: [UploadController],
    providers: [CloudinaryService],
    exports: [CloudinaryService], // Export for use in other modules
})
export class UploadModule { }
