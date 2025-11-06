export interface ReviewSchema {
  review_id: number;
  user_id: number;
  restaurant_id: number;
  content: string;
  rating: number;              
  image_url: string | null;   
  created_at: string;
  updated_at: string;
}

export interface ReviewInsert {
  user_id: number;
  restaurant_id: number;
  content: string;
  rating?: number;
  image_url?: string | null;
}

export interface ReviewUpdate {
  content?: string;
  rating?: number;
  image_url?: string | null;
  updated_at?: string;
}

export interface Review {
  id: number;
  content: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
  userName: string;
  userProfileImage: string | null;
  images: string[];            
  restaurantId?: number;        
  userId?: number;            
  isMyReview?: boolean;
}

export interface CreateReviewRequest {
  restaurantId: number;         
  content: string;
  rating?: number;
  image?: File;           
}

export interface UpdateReviewRequest {
  content?: string;
  rating?: number;
  image?: File;
  deleteImage?: boolean;     
}

export interface ReviewListResponse {
  reviews: Review[];
  total: number;
  page?: number;
  pageSize?: number;
}

export function reviewSchemaToReview(schema: ReviewSchema): Review {
  return {
    id: schema.review_id,
    content: schema.content,
    rating: schema.rating || 5,
    createdAt: schema.created_at,
    updatedAt: schema.updated_at,
    userName: 'Anonymous',  
    userProfileImage: null,
    images: schema.image_url ? [schema.image_url] : [],
    restaurantId: schema.restaurant_id,
    userId: schema.user_id,
  };
}

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