import { useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface UseImageUploadReturn {
  uploadImage: (file: File, userId: string | number) => Promise<string | null>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

export function useImageUpload(): UseImageUploadReturn {
  const uploadImage = useCallback(async (file: File, userId: string | number): Promise<string | null> => {
    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      console.error(`파일이 너무 큽니다: ${file.name}`);
      alert(`${file.name}은(는) 5MB를 초과합니다.`);
      return null;
    }

    // 파일 타입 검증
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('JPEG, PNG, GIF, WEBP 형식의 이미지만 업로드할 수 있습니다.');
      return null;
    }

    // 파일 경로 생성
    const fileExtension = file.name.split('.').pop();
    const path = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExtension}`;
    
    try {
      // Supabase Storage에 업로드
      const { error: uploadError } = await supabase.storage
        .from('review_images')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Public URL 가져오기
      const { data } = supabase.storage
        .from('review_images')
        .getPublicUrl(path);

      return data.publicUrl;
    } catch (error) {
      console.error('[useImageUpload] Upload Error:', error);
      return null;
    }
  }, []);

  return { uploadImage };
}