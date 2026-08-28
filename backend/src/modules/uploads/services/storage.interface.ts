export interface StorageService {
  uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ url: string; key: string; fileName: string; mimeType: string; fileSize: number }>;
  deleteFile(key: string): Promise<boolean>;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';
