import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService, STORAGE_SERVICE } from './services/storage.interface';

@Injectable()
export class UploadsService {
  constructor(
    @Inject(STORAGE_SERVICE) private storageService: StorageService,
    private prisma: PrismaService,
  ) {}

  async processUpload(
    file: Express.Multer.File,
    folder: string = 'media',
    duration?: number,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided for upload');
    }

    const uploaded = await this.storageService.uploadFile(file, folder);

    // Save attachment in database (unlinked to message initially, linked upon message creation)
    // To allow standalone storage or pending attachments:
    return {
      url: uploaded.url,
      fileName: uploaded.fileName,
      mimeType: uploaded.mimeType,
      fileSize: uploaded.fileSize,
      duration: duration || null,
    };
  }
}
