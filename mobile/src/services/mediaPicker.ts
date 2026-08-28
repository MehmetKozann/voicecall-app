import { launchImageLibrary, launchCamera, Asset } from 'react-native-image-picker';
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';

export interface PickedMedia {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

export const MediaPickerService = {
  /**
   * Pick Image from Gallery
   */
  async pickImageFromGallery(): Promise<PickedMedia | null> {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1080,
      });

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.uri) {
          return {
            uri: asset.uri,
            name: asset.fileName || `image_${Date.now()}.jpg`,
            type: asset.type || 'image/jpeg',
            size: asset.fileSize,
          };
        }
      }
    } catch (err) {
      console.warn('Gallery picker error:', err);
    }
    return null;
  },

  /**
   * Capture Photo from Camera
   */
  async takePhoto(): Promise<PickedMedia | null> {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: true,
      });

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.uri) {
          return {
            uri: asset.uri,
            name: asset.fileName || `camera_${Date.now()}.jpg`,
            type: asset.type || 'image/jpeg',
            size: asset.fileSize,
          };
        }
      }
    } catch (err) {
      console.warn('Camera capture error:', err);
    }
    return null;
  },

  /**
   * Pick Document / File
   */
  async pickDocument(): Promise<PickedMedia | null> {
    try {
      const res = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.allFiles],
      });

      if (res && res.uri) {
        return {
          uri: res.uri,
          name: res.name || 'document',
          type: res.type || 'application/octet-stream',
          size: res.size || undefined,
        };
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.warn('Document picker error:', err);
      }
    }
    return null;
  },
};
