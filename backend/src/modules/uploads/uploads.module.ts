import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { STORAGE_SERVICE } from './services/storage.interface';
import { LocalStorageService } from './services/local-storage.service';
import { S3StorageService } from './services/s3-storage.service';

@Module({
  imports: [ConfigModule],
  controllers: [UploadsController],
  providers: [
    UploadsService,
    {
      provide: STORAGE_SERVICE,
      useFactory: (configService: ConfigService) => {
        const driver = configService.get<string>('storage.driver');
        if (driver === 's3') {
          return new S3StorageService(configService);
        }
        return new LocalStorageService(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [UploadsService, STORAGE_SERVICE],
})
export class UploadsModule {}
