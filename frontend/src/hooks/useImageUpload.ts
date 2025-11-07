import { useCallback } from 'react';
import apiClient from '../lib/axios';

interface UseImageUploadReturn {
  uploadImage: (file: File, userId: string | number) => Promise<string | null>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

export function useImageUpload(): UseImageUploadReturn {
  const uploadImage = useCallback(async (file: File, userId: string | number): Promise<string | null> => {
    if (file.size > MAX_FILE_SIZE) {
      alert(`${file.name}은(는) 5MB를 초과합니다.`);
      return null;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('JPEG, PNG, GIF, WEBP 형식의 이미지만 업로드할 수 있습니다.');
      return null;
    }

    try {
      // 1. 백엔드에서 presigned URL 요청
      const presignRes = await apiClient.post('/uploads/presign', {
        fileName: file.name,
        userId,
        contentType: file.type,
      });
      const { uploadUrl, publicUrl } = presignRes.data;

      // 2. 프리사인드 URL로 직접 업로드
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      return publicUrl;
    } catch (error) {
      console.error('[useImageUpload] Upload Error:', error);
      alert('이미지 업로드 중 오류가 발생했습니다.');
      return null;
    }
  }, []);

  return { uploadImage };
}
