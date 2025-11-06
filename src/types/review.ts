// 리뷰
export interface Review {
  id: number;                    // ✅ string → number로 변경
  content: string;
  rating: number;                // ✅ optional 제거
  createdAt: string;
  userName: string;
  userProfileImage: string | null;  // ✅ optional 제거
  images: string[];              // ✅ optional 제거
  
  // 선택적 필드
  restaurantId?: string;         // optional로 유지
  userId?: string;               // optional로 유지
  updatedAt?: string;
  isMyReview?: boolean;
}

// 리뷰 작성 요청
export interface CreateReviewRequest {
  restaurantId: string;
  content: string;
  rating?: number;
  images?: File[];  // 업로드할 이미지 파일들
}

// 리뷰 수정 요청
export interface UpdateReviewRequest {
  content: string;
  rating?: number;
  images?: File[];
  deletedImageUrls?: string[];  // 삭제할 이미지 URL들
}

// 리뷰 목록 응답
export interface ReviewListResponse {
  reviews: Review[];
  total: number;
  page?: number;
  pageSize?: number;
}