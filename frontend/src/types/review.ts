export interface ReviewSchema {
  review_id: number;
  user_id: number;
  restaurant_id: number;
  content: string;
  rating: number;              // ⚠️ ERD에 없지만 추가 권장
  image_url: string | null;     // 단일 이미지
  created_at: string;
  updated_at: string;
}

/** DB에 삽입할 리뷰 데이터 */
export interface ReviewInsert {
  user_id: number;
  restaurant_id: number;
  content: string;
  rating?: number;
  image_url?: string | null;
}

/** DB에서 업데이트할 리뷰 데이터 */
export interface ReviewUpdate {
  content?: string;
  rating?: number;
  image_url?: string | null;
  updated_at?: string;
}

// ============================================
// 🎨 프론트엔드 UI 타입 (camelCase)
// ============================================

/** UI에서 사용하는 리뷰 타입 */
export interface Review {
  id: number;
  content: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
  userName: string;
  userProfileImage: string | null;
  images: string[];              // image_url을 배열로 변환
  
  // 선택적 필드
  restaurantId?: number;         // ✅ string → number
  userId?: number;               // ✅ string → number
  isMyReview?: boolean;
}

// ============================================
// 📝 API 요청/응답 타입
// ============================================

/** 리뷰 작성 요청 */
export interface CreateReviewRequest {
  restaurantId: number;          // ✅ string → number
  content: string;
  rating?: number;
  image?: File;                  // ✅ 단일 이미지 (ERD 기준)
}

/** 리뷰 수정 요청 */
export interface UpdateReviewRequest {
  content?: string;
  rating?: number;
  image?: File;
  deleteImage?: boolean;         // 이미지 삭제 플래그
}

/** 리뷰 목록 응답 */
export interface ReviewListResponse {
  reviews: Review[];
  total: number;
  page?: number;
  pageSize?: number;
}

// ============================================
// 🔄 타입 변환 유틸리티
// ============================================

/** DB 스키마 → UI 타입 변환 */
export function reviewSchemaToReview(schema: ReviewSchema): Review {
  return {
    id: schema.review_id,
    content: schema.content,
    rating: schema.rating || 5,
    createdAt: schema.created_at,
    updatedAt: schema.updated_at,
    userName: 'Anonymous',  // TODO: users 테이블 조인 필요
    userProfileImage: null,
    images: schema.image_url ? [schema.image_url] : [],
    restaurantId: schema.restaurant_id,
    userId: schema.user_id,
  };
}

/** UI 타입 → DB Insert 변환 */
export function reviewToInsert(
  review: CreateReviewRequest, 
  userId: number,
  imageUrl?: string | null
): ReviewInsert {
  return {
    user_id: userId,
    restaurant_id: review.restaurantId,
    content: review.content,
    rating: review.rating,
    image_url: imageUrl || null,
  };
}

/** UI 타입 → DB Update 변환 */
export function reviewToUpdate(
  review: UpdateReviewRequest,
  imageUrl?: string | null
): ReviewUpdate {
  const update: ReviewUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (review.content !== undefined) {
    update.content = review.content;
  }
  if (review.rating !== undefined) {
    update.rating = review.rating;
  }
  if (imageUrl !== undefined) {
    update.image_url = imageUrl;
  }

  return update;
}