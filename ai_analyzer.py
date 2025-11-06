import os
import json
import openai
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
OPENAI_KEY = os.environ.get("OPENAI_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY or not OPENAI_KEY:
    print("환경 변수(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY)가 설정되지 않았습니다.")
    exit()

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
client = openai.OpenAI(api_key=OPENAI_KEY)

VEGETARIAN_ENUMS = [
    'vegan', 'lacto', 'ovo', 'lacto-ovo', 'pesco', 'pollo', 'flexitarian', 'others'
]

SYSTEM_PROMPT = f"""
당신은 한국 음식과 채식주의(Vegetarianism)에 매우 능숙한 음식 분석 전문가입니다.
주어진 메뉴 이름을 분석하여, 이 메뉴가 어떤 채식 단계에 해당하는지 분류해야 합니다.

[분류 기준]
- 'vegan': 완전 채식 (우유, 계란, 꿀 등 모든 동물성 X). (예: 비건 콤부차, 소이라떼)
- 'lacto': 유제품(우유, 치즈) 포함, 계란 X. (예: 카페라떼, 치즈 피자)
- 'ovo': 계란 포함, 유제품 X. (예: 계란빵 - 우유가 안 들어갔다고 가정)
- 'lacto-ovo': 유제품 및 계란 포함. (예: 치즈 오믈렛)
- 'pesco': 생선, 해산물 포함. (예: 명란 파스타, 새우 버거, 오징어 볶음)
- 'pollo': 가금류(닭, 오리) 포함. (예: 치킨 샐러드, 닭가슴살 샌드위치)
- 'flexitarian': 붉은 고기(돼지, 소)를 포함하거나, 위 6개에 속하지 않는 기타 비채식 메뉴. (예: 스테이크, 불고기, 돈가스, 탕수육, 갈비, 순대, 족발 등)
- 'others': 메뉴 이름만으로는 판단 불가.

---
[분류 원칙] (매우 중요)
1.  재료 분석: 먼저 메뉴 이름의 핵심 재료를 분석합니다. (예: '불고기 머쉬룸 poke' -> '불고기', '버섯')
2.  동물성 재료 확인: 명확한 동물성 재료가 있는지 확인합니다.
    - '불고기', '소고기', '돼지', '베이컨', '등심', '안심', '비프', '내장'-> 'flexitarian'
    - '치킨', '닭' -> 'pollo'
    - '연어', '새우', '명란', '생선', '오징어', '문어' -> 'pesco'
    - '치즈', '우유', '요거트', '크림', '버터' (단, '소이' 제외) -> 'lacto'
    - '계란', '에그', '달걀' -> 'ovo'
3.  재료 중 계란과 유제품이 모두 포함된 경우에는 'lacto-ovo'로 분류합니다.
4.  비건 메뉴 판단 (가장 중요): 위 2번 항목에 해당하는 동물성 재료가 전혀 없다면, 'lacto-ovo'가 아닌 'vegan'을 기본으로 고려합니다.
    - 특히 '샐러드', '야채', '과일', '두부', '고사리', '템페', '라페', '깻잎', '당근', '토마토', '케일', '배추', '우엉', '가지', '메밀', '아보카도'가 주재료인 메뉴는 'vegan'으로 분류합니다. (예: '아보카도 자몽 샐러드' -> 'vegan', '고사리 누들 파스타' -> 'vegan' 등)
    - '소이라떼', '오트라떼' 등 식물성 우유 메뉴는 'vegan'입니다.
    - 이름에 비건이라고 표시된 경우 무조건 'vegan'으로 분류합니다. (예: '비건 버거', '비건 라떼' 등)
    - 가스파초는 이름에 육류나 유제품이 명시되지 않은 이상 'vegan'으로 분류합니다.
    - 들어간 재료에 '계란', '우유', '치즈' 등이 명시되지 않은 이상, 'lacto', 'ovo', 'lacto-ovo'로 절대 분류하지 마세요.
5.  애매한 음료 처리: '아메리카노', '청포도에이드'처럼 채식 분류가 무의미한 '음료'의 경우에만 'others'로 분류하고 신뢰도를 낮춥니다.
    - 이 규칙을 '샐러드' 같은 '요리'에는 절대 적용하지 마세요.
    - 아포카토는 아보카도가 아니라 커피 음료이므로 'others'로 분류합니다. 
6.  음식 중 정체가 명확하지만 들어간 재료를 알 수 없는 경우에는 'flexitarian'로 분류합니다. (예: '잡채', '나폴리탄', '일반 파스타' 등)
7.  불확실한 경우: 메뉴 이름만으로는 어떤 메뉴인지 판단이 어려운 경우에는 'others'로 분류합니다. (예: '스페셜 메뉴', '셰프 추천', '오늘의 요리', '세트 메뉴' 등)
8.  메뉴 이름에서 재료를 충분히 알 수 있는 경우에는, 재료가 명확하지 않다는 이유를 들지 마세요. 최대한 명확하게 판단 근거를 들어 분류해야 합니다.
9.  이름에 소고기나 돼지고기의 종류 혹은 부위가 포함된 경우에는 무조건 'flexitarian'로 분류합니다. '순대' 등 내장이 포함되는 음식도 'flexitarian'로 분류하세요.
10. 재료를 알 수 없는 경우 중 음료가 아닌 음식이라면, 'flexitarian'로 분류해야 합니다. 음료의 경우는 'others'로 분류하세요.
11. '~밥'이라고 표기되었거나 '라이스'가 포함된 경우 음료가 아닌 음식에 해당합니다. (예: '닭가슴살 볶음밥' -> 'pollo', '야채 볶음밥' -> 'vegan')
12. '표고', '버섯', '머쉬룸' 등으로 표기되어 채소가 주재료인 경우에는 육류나 해산물이 들어가지 않을 가능성이 높으므로 음식의 종류를 보고 'vegan'/'lacto-ovo'/'lacto'/'ovo'으로 분류합니다. (예: '머쉬룸 크림 파스타' -> 'lacto')
13. 재료 앞에 'NO'라고 명시된 경우에는 해당 재료가 들어가지 않는다는 뜻입니다. (예: 'NO 치즈 베이글' -> 'ovo' 혹은 'vegan'으로 분류 가능)
14. '글루텐 프리' 표시는 채식 단계와 무관하므로 무시합니다. 그러나 케이크의 경우 유제품이 들어갈 가능성이 높으므로 'lacto' 혹은 'lacto-ovo'로 분류합니다. (예: '글루텐 프리 당근 케이크' -> 'lacto-ovo')
15. 가지 스테이크의 경우 가지가 주재료이므로 'vegan'으로 분류합니다. (예: '가지 스테이크 샐러드' -> 'vegan')
---

[출력 형식]
당신은 반드시 다음 세 개의 키를 가진 JSON 객체로만 응답해야 합니다:
1. "level": 메뉴가 속하는 채식 단계를 다음 목록에서 정확히 하나만 골라야 합니다.
   {json.dumps(VEGETARIAN_ENUMS)}
2. "confidence": 당신의 분류에 대한 신뢰도 점수를 0.0 (불확실)에서 1.0 (확신) 사이의 숫자로 표현해야 합니다.
3. "description": 당신의 판단 근거를 간단히 서술하는 한국어로 된 문자열입니다.
"""


def get_vegetarian_level_from_llm(menu_name: str):
    print(f"-> [메뉴 분석] LLM 요청: {menu_name}")
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo-1106",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": menu_name}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )
        
        data = json.loads(response.choices[0].message.content)
        
        level = data.get('level')
        confidence = data.get('confidence')
        description = data.get('description', '')

        if level not in VEGETARIAN_ENUMS:
            print(f"WARNING: LLM이 유효하지 않은 단계('{level}')를 반환. 'others'로 강제 조정.")
            level = 'others'
            confidence = 0.1

        print(f"<- [메뉴 분석] 완료: {level} (신뢰도: {confidence}, 근거: {description})")
        return level, float(confidence), description

    except Exception as e:
        print(f"ERROR: [메뉴 분석] LLM API 호출 또는 JSON 파싱 실패: {e}")
        return None, None, None


def analyze_all_menus():
    print("\n========== 1. 메뉴 채식 단계 분석 시작 ==========")
    print("분석이 필요한 메뉴를 DB에서 조회합니다...")
    try:
        response = supabase.table('menus').select('menu_id, menu_name') \
                           .or_('vegetarian_level.is.null') \
                           .order('menu_id', desc=False) \
                           .execute()
        menus_to_analyze = response.data
    except Exception as e:
        print(f"DB 조회 실패: {e}")
        return

    if not menus_to_analyze:
        print("[메뉴 분석] : 분석할 메뉴가 없습니다. 모든 메뉴가 최신 상태입니다.")
        return
        
    print(f"총 {len(menus_to_analyze)}개의 메뉴 분석을 시작합니다.")

    for menu in menus_to_analyze:
        menu_id = menu['menu_id']
        menu_name = menu['menu_name']
        
        print(f"\n--- (ID: {menu_id}) {menu_name} ---")
        
        level, confidence, description = get_vegetarian_level_from_llm(menu_name)
        
        if level and confidence is not None:
            try:
                supabase.table('menus').update({
                    'vegetarian_level': level,
                    'confidence_score': confidence,
                    'description': description,
                    'analyzed_at': 'now()'
                }).eq('menu_id', menu_id).execute()
                
                print(f"(ID: {menu_id}) DB 업데이트 완료: {level} ({confidence*100}%)")
            
            except Exception as e:
                print(f"(ID: {menu_id}) DB 업데이트 실패: {e}")
        else:
            print(f"(ID: {menu_id}) LLM 분석 실패. DB 업데이트를 건너뜁니다.")

    print("\n[메뉴 분석] : 작업 완료!")

RESTAURANT_CATEGORIES_MAP = {
    'korean': '한식',
    'japanese': '일식',
    'chinese': '중식',
    'western': '양식',
    'cafe': '카페',
    'other': '기타'
}
RESTAURANT_CATEGORY_KEYS = list(RESTAURANT_CATEGORIES_MAP.keys()) 

RESTAURANT_SYSTEM_PROMPT = f"""
당신은 레스토랑 데이터 분석가입니다.
제공된 메뉴 목록을 보고, 이 레스토랑 혹은 카페에서 제공하는 음식의 주요 카테고리가 무엇인지 분류해야 합니다.

[카테고리 목록과 기준]
- 'korean': 한식 (비빔밥, 찌개, 불고기, 김밥, 떡볶이 등)
- 'japanese': 일식 (초밥, 라멘, 돈카츠, 우동, 소바, 덮밥(돈부리) 등)
- 'chinese': 중식 (짜장면, 짬뽕, 탕수육, 마라탕 등)
- 'western': 양식 (파스타, 피자, 스테이크, 리조또, 샐러드 등)
- 'cafe': 카페 ('아메리카노', '라떼', '에이드' 등 음료 혹은 '깜빠뉴', '빵', '소금빵', '크루아상' 등 빵 중심)
- 'other': 기타 (인도 음식 등 위 5개로 분류하기 애매한 퓨전, 주점 등)

[출력 형식]
반드시 다음 세 개의 키를 가진 JSON 객체로만 응답해야 합니다:
1. "category_key": 위 [카테고리 목록]의 6개 '영어 키' (예: 'korean', 'cafe') 중 하나.
2. "confidence": 당신의 분류에 대한 신뢰도 점수 (0.0 ~ 1.0).
3. "description": 당신의 판단 근거 (간단한 한국어 문자열).
   (예: {{"category_key": "korean", "confidence": 0.9, "description": "비빔밥, 찌개 등 한식 메뉴가 다수 포함됨."}})
"""

def get_restaurant_category_from_llm(menu_names: list):
    menu_list_str = ", ".join(menu_names)
    print(f"-> [식당 분석] LLM 요청: (메뉴 {len(menu_names)}개) {menu_list_str[:100]}...")
    
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo-1106",
            messages=[
                {"role": "system", "content": RESTAURANT_SYSTEM_PROMPT},
                {"role": "user", "content": menu_list_str}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )
        
        data = json.loads(response.choices[0].message.content)
        
        category_key = data.get('category_key') 
        confidence = data.get('confidence', 0.5)
        description = data.get('description', '')

        if category_key not in RESTAURANT_CATEGORY_KEYS:
            print(f"WARNING: LLM이 유효하지 않은 카테고리 키('{category_key}')를 반환. 'other'로 강제 조정.")
            category_key = 'other'
            confidence = 0.1

        category_korean = RESTAURANT_CATEGORIES_MAP[category_key] 

        print(f"<- [식당 분석] 완료: {category_korean} (신뢰도: {confidence}, 근거: {description})")
        
        return category_korean, float(confidence), description

    except Exception as e:
        print(f"ERROR: [식당 분석] LLM API 호출 또는 JSON 파싱 실패: {e}")
        return None, None, None


def analyze_restaurant_categories():
    print("\n========== 2. 식당 카테고리 분석 시작 ==========")
    print("분석할 식당을 DB에서 조회합니다.")
    try:
        response = supabase.table('restaurants') \
                           .select('restaurant_id, name') \
                           .order('restaurant_id', desc=False) \
                           .execute()
        restaurants_to_analyze = response.data
    except Exception as e:
        print(f"DB 조회 실패: {e}")
        return

    if not restaurants_to_analyze:
        print("[식당 분석] : 분석할 식당이 없습니다.")
        return
        
    print(f"총 {len(restaurants_to_analyze)}개의 식당 카테고리 분석을 시작합니다.")

    for restaurant in restaurants_to_analyze:
        rest_id = restaurant['restaurant_id']
        rest_name = restaurant['name']
        
        print(f"\n--- (ID: {rest_id}) {rest_name} ---")
        
        try:
            response = supabase.table('menus') \
                               .select('menu_name') \
                               .eq('restaurant_id', rest_id) \
                               .execute()
            menu_data = response.data
        except Exception as e:
            print(f"(ID: {rest_id}) 메뉴 목록 조회 실패: {e}")
            continue

        if not menu_data:
            print("(ID: {rest_id}) 메뉴가 DB에 없어 카테고리 분석을 건너뜁니다.")
            continue

        menu_names = [menu['menu_name'] for menu in menu_data]
        
        category, confidence, description = get_restaurant_category_from_llm(menu_names)
        
        if category:
            try:
                supabase.table('restaurants').update({
                    'category': category,
                    'category_description': description 
                }).eq('restaurant_id', rest_id).execute()
                
                print(f"(ID: {rest_id}) DB 업데이트 완료: {category} (신뢰도: {confidence}%)")
            
            except Exception as e:
                print(f"(ID: {rest_id}) DB 업데이트 실패: {e}")
        else:
            print(f"(ID: {rest_id}) LLM 분석 실패. DB 업데이트를 건너뜁니다.")

    print("\n[식당 분석] : 작업 완료!")


if __name__ == "__main__":
    print("AI 분석 스크립트를 시작합니다.")
    
    analyze_all_menus() 
    #analyze_restaurant_categories() 
    
    print("\n모든 AI 분석 작업이 완료되었습니다.")