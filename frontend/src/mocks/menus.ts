import type { Menu } from "../types/menu";

export const mockMenus: Record<string, Menu[]> = {
  'rest-1': [
    {
      id: 'menu-1',
      name: '비건 샐러드',
      price: 12000,
      description: '신선한 채소와 과일로 만든 샐러드',
      imageUrl: 'https://via.placeholder.com/200x150?text=Vegan+Salad',
      vegetarianLevels: [
        { level: 'vegan', probability: 95, reason: '동물성 재료 미포함' },
        { level: 'lacto', probability: 5, reason: '드레싱에 유제품 가능성' },
      ],
    },
    {
      id: 'menu-2',
      name: '두부 스테이크',
      price: 15000,
      description: '구운 두부와 채소 그릴',
      vegetarianLevels: [
        { level: 'vegan', probability: 90, reason: '식물성 재료 중심' },
        { level: 'lacto', probability: 10, reason: '소스에 버터 사용 가능' },
      ],
    },
    {
      id: 'menu-3',
      name: '퀴노아 볼',
      price: 13000,
      description: '퀴노아와 각종 채소',
      vegetarianLevels: [
        { level: 'vegan', probability: 100, reason: '완전 채식' },
      ],
    },
  ],

  // 식당 2의 메뉴들
  'rest-2': [
    {
      id: 'menu-4',
      name: '치즈 리조또',
      price: 16000,
      description: '크리미한 치즈 리조또',
      vegetarianLevels: [
        { level: 'lacto', probability: 95, reason: '치즈와 우유 사용' },
        { level: 'lacto-ovo', probability: 5, reason: '계란 추가 가능' },
      ],
    },
    {
      id: 'menu-5',
      name: '버섯 크림 파스타',
      price: 14000,
      description: '생크림과 버섯의 조화',
      vegetarianLevels: [
        { level: 'lacto', probability: 90, reason: '생크림 사용' },
        { level: 'vegan', probability: 10, reason: '두유로 대체 가능' },
      ],
    },
  ],

  // 식당 3의 메뉴들
  'rest-3': [
    {
      id: 'menu-6',
      name: '연어 샐러드',
      price: 18000,
      description: '훈제 연어와 신선한 채소',
      vegetarianLevels: [
        { level: 'pesco', probability: 100, reason: '생선 포함' },
      ],
    },
    {
      id: 'menu-7',
      name: '새우 파스타',
      price: 19000,
      description: '통통한 새우와 토마토 소스',
      vegetarianLevels: [
        { level: 'pesco', probability: 100, reason: '해산물 포함' },
      ],
    },
  ],

  // 식당 4의 메뉴들
  'rest-4': [
    {
      id: 'menu-8',
      name: '김밥',
      price: 3500,
      description: '야채 김밥',
      vegetarianLevels: [
        { level: 'lacto-ovo', probability: 60, reason: '달걀 포함' },
        { level: 'vegan', probability: 40, reason: '야채만 요청 가능' },
      ],
    },
    {
      id: 'menu-9',
      name: '비빔밥',
      price: 8000,
      description: '나물과 고추장',
      vegetarianLevels: [
        { level: 'lacto-ovo', probability: 50, reason: '계란 포함' },
        { level: 'vegan', probability: 50, reason: '계란 빼기 가능' },
      ],
    },
  ],

  // 식당 5의 메뉴들
  'rest-5': [
    {
      id: 'menu-10',
      name: '아보카도 토스트',
      price: 9000,
      description: '통곡물 빵 위에 아보카도',
      vegetarianLevels: [
        { level: 'vegan', probability: 80, reason: '식물성 재료' },
        { level: 'lacto', probability: 20, reason: '빵에 우유 가능' },
      ],
    },
    {
      id: 'menu-11',
      name: '오트밀 라떼',
      price: 5500,
      description: '귀리 우유 라떼',
      vegetarianLevels: [
        { level: 'vegan', probability: 100, reason: '식물성 우유' },
      ],
    },
  ],
};