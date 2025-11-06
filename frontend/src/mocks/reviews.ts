import type { Review } from "../types/review";

export const mockReviews: Record<string, Review[]> = {
  // 식당 1의 리뷰들
  'rest-1': [
    {
      id: 'review-1',
      restaurantId: 'rest-1',
      userId: 'user-1',
      userName: '비건러버',
      userProfileImage: 'https://via.placeholder.com/50?text=U1',
      content: '비건 샐러드 정말 맛있어요! 재료가 신선하고 양도 푸짐합니다. 자주 올 것 같아요 😊',
      rating: 5,
      images: [
        'https://via.placeholder.com/300x200?text=Review+Photo+1',
      ],
      createdAt: '2024-01-20T14:30:00Z',
      isMyReview: false,
    },
    {
      id: 'review-2',
      restaurantId: 'rest-1',
      userId: 'user-2',
      userName: '채식초보',
      content: '처음 가본 비건 레스토랑인데 생각보다 맛있네요. 다만 가격이 조금 비싼 편이에요.',
      rating: 4,
      createdAt: '2024-01-18T11:20:00Z',
      isMyReview: false,
    },
    {
      id: 'review-3',
      restaurantId: 'rest-1',
      userId: 'user-3',
      userName: '건강지킴이',
      userProfileImage: 'https://via.placeholder.com/50?text=U3',
      content: '두부 스테이크 강추합니다! 소스가 정말 맛있어요.',
      rating: 5,
      images: [
        'https://via.placeholder.com/300x200?text=Tofu+Steak',
        'https://via.placeholder.com/300x200?text=Interior',
      ],
      createdAt: '2024-01-15T19:45:00Z',
      isMyReview: true,
    },
  ],

  // 식당 2의 리뷰들
  'rest-2': [
    {
      id: 'review-4',
      restaurantId: 'rest-2',
      userId: 'user-4',
      userName: '파스타매니아',
      content: '치즈 리조또가 정말 크리미해요! 락토 베지테리언에게 완벽한 메뉴.',
      rating: 5,
      createdAt: '2024-01-19T13:00:00Z',
      isMyReview: false,
    },
    {
      id: 'review-5',
      restaurantId: 'rest-2',
      userId: 'user-5',
      userName: '맛집탐방러',
      userProfileImage: 'https://via.placeholder.com/50?text=U5',
      content: '버섯 크림 파스타 맛있어요. 분위기도 좋고 데이트하기 좋은 곳!',
      rating: 4,
      images: [
        'https://via.placeholder.com/300x200?text=Pasta',
      ],
      createdAt: '2024-01-17T18:30:00Z',
      isMyReview: false,
    },
  ],

  // 식당 5의 리뷰들
  'rest-5': [
    {
      id: 'review-6',
      restaurantId: 'rest-5',
      userId: 'user-6',
      userName: '카페홀릭',
      userProfileImage: 'https://via.placeholder.com/50?text=U6',
      content: '아보카도 토스트 완전 맛있어요! 오트밀 라떼도 고소하고 좋았습니다. 인테리어도 예뻐서 사진 찍기 좋아요 📸',
      rating: 5,
      images: [
        'https://via.placeholder.com/300x200?text=Avocado+Toast',
        'https://via.placeholder.com/300x200?text=Oat+Latte',
        'https://via.placeholder.com/300x200?text=Cafe+Interior',
      ],
      createdAt: '2024-01-22T10:15:00Z',
      isMyReview: false,
    },
    {
      id: 'review-7',
      restaurantId: 'rest-5',
      userId: 'user-7',
      userName: '플렉시테리언',
      content: '완전 비건 카페라 좋아요. 음료도 맛있고 공부하기도 좋은 환경입니다.',
      rating: 4,
      createdAt: '2024-01-21T15:40:00Z',
      isMyReview: true,
    },
  ],
};