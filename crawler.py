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
from selenium.common.exceptions import TimeoutException, NoSuchElementException

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
    """(메뉴가 없을 때 호출) 메뉴와 이미지를 모두 크롤링합니다."""
    chrome_options = Options()
    # chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36")
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    wait = WebDriverWait(driver, 15)

    try:
        image_urls = []
        menus_parsed = []
        
        driver.get("https://map.naver.com/v5/")
        driver.maximize_window()

        search_box = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input.input_search")))
        search_box.send_keys(place_name)
        search_box.send_keys(Keys.ENTER)
        print(f"'{place_name}' 검색 중...")

        driver.switch_to.default_content()

        print("검색 결과 프레임(searchIframe 또는 entryIframe) 로드 대기 중...")
        try:
            wait.until(EC.any_of(
                EC.frame_to_be_available_and_switch_to_it((By.ID, "searchIframe")),
                EC.frame_to_be_available_and_switch_to_it((By.ID, "entryIframe"))
            ))

            try:
                driver.find_element(By.CSS_SELECTOR, "div.CB8aP")
                print("'entryIframe' 자동 로드 확인 (단일 검색 결과).")
            except NoSuchElementException:
                print("INFO: 'searchIframe' 로드 확인. 첫 항목을 클릭합니다.")
                
                first_item_selector = (By.CSS_SELECTOR, 
                                       "li.VLTHu a.place_bluelink, " +
                                       "li.TYVr9 a.place_bluelink, " +
                                       "li.UEzoS a.place_bluelink, " +
                                       "li._3t81n a._3P42t")
                
                first_item = wait.until(EC.element_to_be_clickable(first_item_selector))
                driver.execute_script("arguments[0].click();", first_item)
                
                driver.switch_to.default_content()
                wait.until(EC.frame_to_be_available_and_switch_to_it((By.ID, "entryIframe")))
                print("상세 페이지(entryIframe) 로드 완료")

        except Exception as e:
            print(f"Iframe 처리 중 알 수 없는 오류: {e}")
            debug_and_save(driver, place_name, "iframe_load_failed")
            return [], []
        

        print("가게 대표 이미지 URL 수집 시도")
        try:
            photo_container = wait.until(EC.visibility_of_element_located(
                (By.CSS_SELECTOR, "div.CB8aP") 
            ))
            img_elements = photo_container.find_elements(By.TAG_NAME, "img")
            image_urls = [img.get_attribute("src") for img in img_elements if img.get_attribute("src")]
            if image_urls:
                print(f"이미지 URL {len(image_urls)}개 발견")
            else:
                print("이미지 태그는 찾았으나 src 속성이 없습니다.")
        except Exception as e:
            print(f"가게 사진 크롤링 실패 (무시하고 메뉴 크롤링 계속): {e}")


        print("메뉴 탭 탐색 시도 (in entryIframe)")
        try:
            menu_tab_selector = (By.XPATH, 
                                   "//span[text()='메뉴'] | " + 
                                   "//a[contains(., '메뉴')] | " + 
                                   "//span[contains(., '메뉴')] | " + 
                                   "//*[@role='tab' and contains(., '메뉴')] | " +
                                   "//a[@data-id='menu']") 
            menu_tab = wait.until(EC.element_to_be_clickable(menu_tab_selector))
            driver.execute_script("arguments[0].click();", menu_tab)
            print("'entryIframe' 내 '메뉴' 탭 클릭 성공")
        except Exception as e:
            print(f"INFO: '메뉴' 탭을 찾지 못했습니다. '홈' 탭 또는 'NPay 주문' 탭에 메뉴가 있다고 가정하고 스크롤합니다.")
            pass
            
        try:
            WebDriverWait(driver, 3).until(EC.frame_to_be_available_and_switch_to_it(
                (By.XPATH, "//iframe[starts-with(@id, 'N_KEY_')]")
            ))
            print("네이버 주문(NPay) iframe으로 진입 성공.")
        except TimeoutException:
            print("INFO: 네이버 주문(NPay) iframe을 찾지 못했습니다. 현재 프레임에서 계속합니다.")
            pass 

        print("Lazy-loading을 위해 스크롤을 먼저 실행합니다.")
        try_scroll_load(driver, attempts=15, delay=0.4)
        
        candidate_selectors = [
            "li.MenuContent__order_list_item__itwHW",
            "ul.Jp8E6 > li",
            "li.E2jtL",
            "li.YhN1t",
            "li._2s3sE", 
            "div.GLY27", 
            "div.menu_item", 
            "ul._2tR6W li", 
            "div._3Kf3R",
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
                 "//li[.//text()[contains(., '원') or contains(., '변동') or contains(., '싯가') or contains(., '문의')]]",
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
        
        processed_names = set() 
        if menu_elements:
            print(f"✅ {len(menu_elements)}개의 후보 항목에서 이름/가격 파싱 시도")
            for el in menu_elements:
                try:
                    name = None
                    price = None
                    
                    name_el = None
                    try:
                        name_el = el.find_element(By.CSS_SELECTOR, "div.MenuContent__tit__313LA")
                    except NoSuchElementException:
                        try:
                            name_el = el.find_element(By.CSS_SELECTOR, "span.A_cdD")
                        except NoSuchElementException:
                            try:
                                name_el = el.find_element(By.CSS_SELECTOR, "span.lPzHi")
                            except NoSuchElementException:
                                try:
                                    name_el = el.find_element(By.CSS_SELECTOR, "div.yQlqY")
                                except NoSuchElementException:
                                    pass
                    
                    if name_el:
                        name = name_el.text.strip()
                        name = re.sub(r'^(대표|인기|BEST|사진)\s*', '', name).strip()

                    price_el = None
                    try:
                        price_el = el.find_element(By.CSS_SELECTOR, "div.MenuContent__price__lhCy9")
                    except NoSuchElementException:
                        try:
                            price_el = el.find_element(By.CSS_SELECTOR, "div.CLSES")
                        except NoSuchElementException:
                            try:
                                price_el = el.find_element(By.CSS_SELECTOR, "div.GXS1X")
                            except NoSuchElementException:
                                try:
                                    price_el = el.find_element(By.XPATH, ".//*[contains(text(), '원') or contains(text(), '변동') or contains(text(), '싯가') or contains(text(), '문의') or contains(text(), '가격없음')]")
                                except NoSuchElementException:
                                    pass

                    if price_el:
                        price_text = price_el.text.strip()
                        if "변동" in price_text or "싯가" in price_text or "문의" in price_text or "가격없음" in price_text:
                            price = None
                        else:
                            price_match = re.search(r"(\d{1,3}(?:[,\d]{0,3})*)", price_text.replace(",", ""))
                            if price_match and price_match.group(1).isdigit():
                                price = int(price_match.group(1))

                    if (name and not price_el) or (not name and not price_el and el.text):
                        full_text = el.text.strip()
                        if not full_text: continue
                        
                        name_raw = ""
                        if "변동" in full_text:
                            price = None
                            name_raw = full_text.split("변동")[0].strip()
                        elif "싯가" in full_text:
                            price = None
                            name_raw = full_text.split("싯가")[0].strip()
                        elif "문의" in full_text:
                            price = None
                            name_raw = full_text.split("문의")[0].strip()
                        elif "가격없음" in full_text:
                            price = None
                            name_raw = full_text.split("가격없음")[0].strip()
                        else:
                            price_match = re.search(r"(\d{1,3}(?:[,\d]{0,3})*)\s*원", full_text.replace("\u00A0", " "))
                            if price_match:
                                price_str = price_match.group(1).replace(",", "")
                                if price_str.isdigit(): price = int(price_str)
                                name_raw = full_text[: price_match.start()].strip()
                            else:
                                name_raw = full_text
                        
                        if not name and name_raw: 
                            first_line = re.sub(r'^(대표|인기|BEST|사진)\s*', '', name_raw.splitlines()[0]).strip()
                            name = first_line

                    if name and len(name) >= 1 and name not in processed_names:
                        menus_parsed.append({"name": name, "price": price})
                        processed_names.add(name)
                        
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
            
        return menus_parsed, image_urls

    except Exception as e:
        print(f"'{place_name}' 메뉴 크롤링 중 오류 발생: {e}")
        print(traceback.format_exc())
        debug_and_save(driver, place_name, "error")
        return [], []

    finally:
        if 'driver' in locals():
            driver.quit()

def search_place_and_get_first_image(place_name):
    chrome_options = Options()
    #chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36")
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    wait = WebDriverWait(driver, 15)

    try:
        image_url = None 
        driver.get("https://map.naver.com/v5/")
        driver.maximize_window()

        search_box = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input.input_search")))
        search_box.send_keys(place_name)
        search_box.send_keys(Keys.ENTER)
        print(f"'{place_name}' 검색 중")

        driver.switch_to.default_content()

        print("검색 결과 프레임(searchIframe 또는 entryIframe) 로드 대기 중")
        try:
            wait.until(EC.any_of(
                EC.frame_to_be_available_and_switch_to_it((By.ID, "searchIframe")),
                EC.frame_to_be_available_and_switch_to_it((By.ID, "entryIframe"))
            ))

            try:
                driver.find_element(By.CSS_SELECTOR, "div.CB8aP")
                print("'entryIframe' 자동 로드 확인 (단일 검색 결과).")
            except NoSuchElementException:
                print("INFO: 'searchIframe' 로드 확인. 첫 항목을 클릭합니다.")
                first_item_selector = (By.CSS_SELECTOR, 
                                       "li.VLTHu a.place_bluelink, " +
                                       "li.TYVr9 a.place_bluelink, " +
                                       "li.UEzoS a.place_bluelink, " +
                                       "li._3t81n a._3P42t")
                first_item = wait.until(EC.element_to_be_clickable(first_item_selector))
                driver.execute_script("arguments[0].click();", first_item)
                driver.switch_to.default_content()
                wait.until(EC.frame_to_be_available_and_switch_to_it((By.ID, "entryIframe")))
                print("상세 페이지(entryIframe) 로드 완료")
        except Exception as e:
            print(f"Iframe 처리 중 알 수 없는 오류: {e}")
            debug_and_save(driver, place_name, "searchIframe_click_failed")
            return None
        
        print("가게 대표 이미지 URL 수집 시도...")
        try:
            photo_container = wait.until(EC.visibility_of_element_located(
                (By.CSS_SELECTOR, "div.CB8aP") 
            ))
            first_img = photo_container.find_element(By.TAG_NAME, "img")
            image_url = first_img.get_attribute("src")
            if image_url:
                print(f"첫 번째 이미지 URL 1개 발견")
            else:
                print("첫 번째 <img> 태그는 찾았으나 src 속성이 없습니다.")
        except NoSuchElementException:
            print("'div.CB8aP' 이미지 컨테이너를 찾을 수 없습니다. (사진이 없는 가게일 수 있음)")
        except Exception as e:
            print(f"가게 사진 크롤링 중 알 수 없는 오류 발생: {e}")
            debug_and_save(driver, place_name, "image_scrape_failed")
        
        return image_url

    except Exception as e:
        print(f"'{place_name}' 메뉴 크롤링 중 심각한 오류 발생: {e}")
        print(traceback.format_exc())
        debug_and_save(driver, place_name, "critical_error")
        return None

    finally:
        if 'driver' in locals():
            driver.quit()

def get_all_restaurants():
    # ===== Supabase 연결 =====
    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경 변수가 설정되지 않았습니다.")
        return
    supabase: Client = create_client(url, key)

    # ===== 전체 restaurants 테이블 조회 =====
    try:
        response = supabase.table('restaurants')\
            .select('restaurant_id, name, thumbnailUrl')\
            .order('restaurant_id', desc=False)\
            .execute()
        all_restaurants = response.data
        if not all_restaurants:
            print("DB에서 레스토랑 정보를 가져오지 못했습니다.")
            return
        print(f"총 {len(all_restaurants)}개의 레스토랑 정보를 DB에서 로드했습니다.")
        
    except Exception as e:
        print(f"DB 조회 실패: {e}")
        return

    # ===== 이미 메뉴가 있는 식당 ID 조회 =====
    try:
        response = supabase.table('menus').select('restaurant_id').execute() 
        has_menus_set = {menu['restaurant_id'] for menu in response.data}
        print(f"DB에 메뉴가 이미 존재하는 식당 {len(has_menus_set)}곳을 확인했습니다.")
    except Exception as e:
        print(f"menus 테이블 조회 실패: {e}")
        return

    # ===== 3. 조건부 크롤링 시작 =====
    for restaurant in all_restaurants:
        restaurant_id = restaurant['restaurant_id']
        restaurant_name = restaurant['name']
        existing_img_url = restaurant['thumbnailUrl']

        need_menus = restaurant_id not in has_menus_set
        need_image = not existing_img_url 

        if not need_menus and not need_image:
            print(f"\n===== '{restaurant_name}' (ID: {restaurant_id}) - 메뉴/이미지가 모두 존재하여 건너뜁니다 =====")
            continue
        
        print(f"\n===== '{restaurant_name}' (ID: {restaurant_id}) 작업 시작 =====")

        if need_menus:
            print("-> 1. 메뉴가 비어있어, 메뉴 (및 이미지) 크롤링을 실행합니다.")
            menus, image_urls = search_place_and_get_menu(restaurant_name)
            
            if menus:
                menu_data = []
                for menu in menus:
                    menu_data.append({
                        'restaurant_id': restaurant_id,
                        'menu_name': menu['name'],
                        'price': menu['price']
                    })
                try:
                    supabase.table('menus').upsert( 
                        menu_data, 
                        on_conflict='restaurant_id, menu_name'
                    ).execute()
                    print("메뉴 DB 저장/업데이트 완료 (Upsert)")
                except Exception as e:
                    print(f"메뉴 DB 저장 실패: {e}")
            else:
                print("메뉴를 추출하지 못했거나 메뉴가 없습니다.")

            if image_urls and need_image:
                first_image_url = image_urls[0]
                print(f"'{restaurant_name}'의 대표 이미지 URL 발견:")
                print(f" - {first_image_url}")
                try:
                    supabase.table("restaurants").update({
                        "thumbnailUrl": first_image_url 
                    }).eq("restaurant_id", restaurant_id).execute()
                    print(f"(ID: {restaurant_id}) 이미지 URL DB 업데이트 완료.")
                except Exception as e:
                    print(f"(ID: {restaurant_id}) 이미지 URL DB 업데이트 실패: {e}")
                
                need_image = False
            
            elif not image_urls and need_image:
                print(f"'{restaurant_name}'의 이미지를 찾지 못했습니다. (메뉴 크롤링 중)")
            
        else:
            print("-> 1. 메뉴가 이미 존재합니다. 메뉴 크롤링을 건너뜁니다.")

        if need_image:
            print("-> 2. 이미지가 비어있어, 이미지 전용 크롤링을 실행합니다.")
            image_url = search_place_and_get_first_image(restaurant_name)
            
            if image_url:
                print(f"'{restaurant_name}'의 대표 이미지 URL 발견:")
                print(f" - {image_url}")
                try:
                    supabase.table("restaurants").update({
                        "thumbnailUrl": image_url 
                    }).eq("restaurant_id", restaurant_id).execute()
                    print(f"(ID: {restaurant_id}) 이미지 URL DB 업데이트 완료.")
                except Exception as e:
                    print(f"(ID: {restaurant_id}) 이미지 URL DB 업데이트 실패: {e}")
            else:
                print(f"'{restaurant_name}'의 이미지를 찾지 못했습니다. (이미지 전용 크롤링)")

    print("\n모든 크롤링 작업 완료")


if __name__ == "__main__":
    get_all_restaurants()