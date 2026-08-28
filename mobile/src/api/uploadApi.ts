import { apiClient } from './client';
import { Attachment } from '../types/chat.types';

export const uploadApi = {
  async uploadFile(file: {
    uri: string;
    name: string;
    type: string;
    duration?: number;
  }): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);

    if (file.duration !== undefined) {
      formData.append('duration', file.duration.toString());
    }

    const res = await apiClient.post<Attachment>('/uploads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return res.data;
  },
};
