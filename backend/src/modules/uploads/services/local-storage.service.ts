import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { StorageService } from './storage.interface';

@Injectable()
export class LocalStorageService implements StorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly basePath: string;
  private readonly publicUrl: string;

  constructor(private configService: ConfigService) {
    this.basePath = path.resolve(
      process.cwd(),
      this.configService.get<string>('storage.localPath') || './uploads',
    );
    this.publicUrl =
      this.configService.get<string>('storage.publicUrl') || 'http://localhost:3000/uploads';

    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'general',
  ): Promise<{ url: string; key: string; fileName: string; mimeType: string; fileSize: number }> {
    const targetDir = path.join(this.basePath, folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const ext = path.extname(file.originalname);
    const uniqueFileName = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(targetDir, uniqueFileName);

    await fs.promises.writeFile(filePath, file.buffer);

    const relativeKey = `${folder}/${uniqueFileName}`;
    const fileUrl = `${this.publicUrl}/${relativeKey}`;

    return {
      url: fileUrl,
      key: relativeKey,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    };
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      const filePath = path.join(this.basePath, key);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
      return false;
    } catch (err) {
      this.logger.error(`Failed to delete local file ${key}: ${err.message}`);
      return false;
    }
  }
}
