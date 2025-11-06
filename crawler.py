import time
import os
import re
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from dotenv import load_dotenv
from supabase import create_client, Client
import traceback
from selenium.common.exceptions import TimeoutException, NoSuchFrameException

load_dotenv()

def debug_and_save(driver, place_name, error_context="unknown"):
    try:
        os.makedirs("debug_menu", exist_ok=True)
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        safe_place_name = re.sub(r'[\\/*?:"<>|]', "", place_name)
        screenshot_path = os.path.join("debug_menu", f"err_{safe_place_name}_{error_context}_{timestamp}.png")
        page_path = os.path.join("debug_menu", f"err_{safe_place_name}_{error_context}_{timestamp}.html")
        driver.save_screenshot(screenshot_path)
        with open(page_path, "w", encoding="utf-8") as f:
            f.write(driver.page_source)
        print("에러 발생. 디버그 파일 생성:")
        print(f" - 스크린샷: {screenshot_path}")
        print(f" - HTML: {page_path}")
    except Exception as e:
        print(f"디버그 파일 저장 실패: {e}")

def try_scroll_load(driver, attempts=10, delay=0.5):
    print("메뉴 전체 로드를 위해 스크롤 시도...")
    last_height = driver.execute_script("return document.body.scrollHeight")
    for i in range(attempts):
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(delay)
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            print(f"{i+1}회 스크롤 후 높이 변경 없음. 로딩 완료 추정.")
            break
        last_height = new_height
    print("스크롤 완료.")


def search_place_and_get_menu(place_name):
    chrome_options = Options()
    # chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36")
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    wait = WebDriverWait(driver, 15)
    wait_short = WebDriverWait(driver, 3) 

    try:
        driver.get("https://map.naver.com/v5/")
        driver.maximize_window()

        search_box = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input.input_search")))
        search_box.send_keys(place_name)
        search_box.send_keys(Keys.ENTER)
        print(f"'{place_name}' 검색 중...")

        driver.switch_to.default_content()
        time.sleep(2) 

        try:
            wait_short.until(EC.frame_to_be_available_and_switch_to_it((By.ID, "entryIframe")))
            print("'entryIframe' 자동 로드 확인 (단일 검색 결과).")

        except TimeoutException:
            print("INFO: 'entryIframe' 자동 로드 실패. 'searchIframe'에서 항목을 검색합니다.")
            try:
                driver.switch_to.frame("searchIframe")
                print("검색 결과 프레임(searchIframe) 진입 완료")

                first_item_selector = (By.CSS_SELECTOR, 
                                       "li.VLTHu a.place_bluelink, " +
                                       "li.TYVr9 a.place_bluelink, " +
                                       "li._3t81n a._3P42t")
                
                first_item = wait.until(EC.element_to_be_clickable(first_item_selector))
                driver.execute_script("arguments[0].click();", first_item)
                print("첫 번째 결과 클릭 완료")

                driver.switch_to.default_content()
                wait.until(EC.frame_to_be_available_and_switch_to_it((By.ID, "entryIframe")))
                print("상세 페이지(entryIframe) 로드 완료")

            except Exception as e:
                print(f"'searchIframe' 처리 중 알 수 없는 오류: {e}")
                debug_and_save(driver, place_name, "searchIframe_click_failed")
                return []
        
        
        print("메뉴 탭 탐색 시도 (in entryIframe)...")
        try:
            menu_tab_selector = (By.XPATH, 
                                 "//span[text()='메뉴'] | " +            
                                 "//a[contains(., '메뉴')] | " +       
                                 "//span[contains(., '메뉴')] | " +    
                                 "//*[@role='tab' and contains(., '메뉴')] | " +
                                 "//a[@data-id='menu']") 
            
            menu_tab = wait.until(
                EC.element_to_be_clickable(menu_tab_selector)
            )
            driver.execute_script("arguments[0].click();", menu_tab)
            print("'entryIframe' 내 '메뉴' 탭 클릭 성공")

        except Exception as e:
            print(f"'entryIframe' 내에서 '메뉴' 탭을 찾는 데 최종 실패했습니다: {e}")
            debug_and_save(driver, place_name, "menu_tab_click_failed")
            return []


        try:
            wait.until(EC.presence_of_element_located(
                (By.XPATH, "//*[contains(text(), '원')]")
            ))
            print("메뉴 데이터 로드 확인 ('원' 텍스트 감지)")
        except Exception:
            print("'원' 텍스트를 감지하지 못했습니다. 메뉴가 없거나 다른 형식일 수 있습니다.")
            debug_and_save(driver, place_name, "menu_content_not_found")
            return []

        try_scroll_load(driver, attempts=15, delay=0.4)

        candidate_selectors = [
            "li.YhN1t", "li._2s3sE", "div.GLY27", "div.menu_item", 
            "ul._2tR6W li", "div._3Kf3R",
        ]
        
        menu_elements = []
        for sel in candidate_selectors:
            try:
                elems = driver.find_elements(By.CSS_SELECTOR, sel)
                if elems:
                    menu_elements = elems
                    print(f"메뉴 후보 발견 by selector: {sel} (count={len(elems)})")
                    break
            except Exception: continue

        if not menu_elements:
            xpath_candidates = [
                "//li[.//text()[contains(., '원')]]",
                "//div[contains(@class,'menu') and .//text()[contains(., '원')]]",
            ]
            for xp in xpath_candidates:
                try:
                    elems = driver.find_elements(By.XPATH, xp)
                    if elems:
                        menu_elements = elems
                        print(f"메뉴 후보 발견 by xpath: {xp} (count={len(elems)})")
                        break
                except Exception: continue

        menus_parsed = []
        processed_texts = set() 
        if menu_elements:
            for el in menu_elements:
                try:
                    text = el.text.strip()
                    if not text or text in processed_texts: continue
                    processed_texts.add(text)

                    price_match = re.search(r"(\d{1,3}(?:[,\d]{0,3})*)\s*원", text.replace("\u00A0", " "))
                    price = None
                    name = None
                    
                    if price_match:
                        price_str = price_match.group(1).replace(",", "")
                        if price_str.isdigit(): price = int(price_str)
                        name_raw = text[: price_match.start()].strip()
                        if name_raw:
                            first_line = re.sub(r'^(대표|인기|BEST|사진)\s*', '', name_raw.splitlines()[0]).strip()
                            name = first_line
                    else:
                        name_lines = text.splitlines()
                        if name_lines:
                            name = re.sub(r'^(대표|인기|BEST|사진)\s*', '', name_lines[0]).strip()

                    if name and len(name) > 1:
                        menus_parsed.append({"name": name, "price": price})
                        
                except Exception as e:
                    print(f"개별 항목 파싱 실패: {el.text[:30]}... ({e})")
                    continue

        if menus_parsed:
            print(f"최종 추출된 메뉴 수: {len(menus_parsed)}")
            for m in menus_parsed:
                print(f"- {m['name']}  |  {m['price'] if m['price'] is not None else '가격없음'}")
        else:
            print("메뉴 파싱에 최종 실패했습니다.")
            debug_and_save(driver, place_name, "parsing_failed")
            
        return menus_parsed

    except Exception as e:
        print(f"'{place_name}' 메뉴 크롤링 중 심각한 오류 발생: {e}")
        print(traceback.format_exc())
        debug_and_save(driver, place_name, "critical_error")
        return []

    finally:
        if 'driver' in locals():
            driver.quit()

def main():
    # ===== Supabase 연결 =====
    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경 변수가 설정되지 않았습니다.")
        return
    supabase: Client = create_client(url, key)

    # ===== restaurants 테이블 조회 =====
    try:
        response = supabase.table('restaurants')\
            .select('restaurant_id, name').order('restaurant_id', desc=False).execute()
        restaurants = response.data
        if not restaurants:
            print("DB에서 레스토랑 정보를 가져오지 못했습니다.")
            return
        print(f"총 {len(restaurants)}개의 레스토랑 정보를 DB에서 로드했습니다.")
        
    except Exception as e:
        print(f"DB 조회 실패: {e}")
        return

    # ===== 각 식당 메뉴 크롤링 및 DB 저장 =====
    for restaurant in restaurants:
        restaurant_id = restaurant['restaurant_id']
        restaurant_name = restaurant['name']
        print(f"\n===== '{restaurant_name}' (ID: {restaurant_id}) 메뉴 크롤링 시작 =====")
        
        menus = search_place_and_get_menu(restaurant_name)
        
        if menus:
            menu_data = []
            for menu in menus:
                menu_data.append({
                    'restaurant_id': restaurant_id,
                    'menu_name': menu['name'],
                    'price': menu['price']
                })
            
            try:
                supabase.table('menus_test').upsert(
                    menu_data, 
                    on_conflict='restaurant_id, menu_name'
                ).execute()
                print("DB 저장/업데이트 완료 (Upsert)")
            except Exception as e:
                print(f"DB 저장 실패: {e}")
                print("INFO: 'menus' 테이블에 (restaurant_id, menu_name) UNIQUE 제약이 걸려있는지 확인하세요.")

        else:
            print("메뉴를 추출하지 못했거나 메뉴가 없습니다.")

    print("\n모든 크롤링 작업 완료")

if __name__ == "__main__":
    main()