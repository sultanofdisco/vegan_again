/**
 * 레스토랑 ID를 숫자로 변환합니다.
 * 'rest-123' 형식이나 문자열 숫자를 number로 변환합니다.
 * 
 * @param restaurantId - 변환할 ID (number 또는 string)
 * @returns 파싱된 숫자 ID 또는 null (실패 시)
 */
export function parseRestaurantId(restaurantId: number | string): number | null {
  // 이미 숫자면 그대로 반환
  if (typeof restaurantId === 'number') {
    return restaurantId;
  }

  // 문자열인 경우
  let parsedId: number;

  // 'rest-' 접두사가 있으면 제거
  if (restaurantId.includes('rest-')) {
    parsedId = parseInt(restaurantId.replace('rest-', ''));
  } else {
    parsedId = parseInt(restaurantId);
  }

  // 유효한 숫자인지 확인
  if (isNaN(parsedId)) {
    console.error('[parseRestaurantId] Invalid ID:', restaurantId);
    return null;
  }

  return parsedId;
}