import { useCallback } from 'react';

interface UseImageUploadReturn {
  uploadImage: (file: File, userId: string | number) => Promise<string | null>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

// 이미지를 base64로 변환
const imageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

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
      console.log('📤 이미지 Base64 변환 시작');
      
      // base64로 변환
      const base64Image = await imageToBase64(file);
      
      console.log('✅ Base64 변환 완료, 백엔드로 전송 시작');

      // 백엔드에 base64 이미지 전송
      const apiClient = (await import('../lib/axios')).default;
      const response = await apiClient.post('/uploads/image', {
        image: base64Image,
        userId,
      });

      console.log('✅ 백엔드 응답:', response.data);

      // 백엔드에서 반환한 이미지 URL 추출
      const imageUrl = response.data.imageUrl || response.data.data?.imageUrl || response.data.url;
      
      if (!imageUrl) {
        console.error('❌ 응답에서 imageUrl을 찾을 수 없음:', response.data);
        throw new Error('이미지 URL을 받지 못했습니다.');
      }

      return imageUrl;

    } catch (error) {
      console.error('[useImageUpload] Upload Error:', error);
      alert('이미지 업로드 중 오류가 발생했습니다.');
      return null;
    }
  }, []);

  return { uploadImage };
}