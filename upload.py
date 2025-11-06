import os
import pandas as pd
from supabase import create_client
from dotenv import load_dotenv
import math
import requests

def upload_from_api():
    
    load_dotenv()

    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    SEOUL_API_KEY = os.getenv("SEOUL_API_KEY") 

    if not SEOUL_API_KEY:
        print(".env 파일에 SEOUL_API_KEY가 설정되지 않았습니다.")
        return
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print(".env 파일에 Supabase URL 또는 SERVICE_ROLE_KEY가 설정되지 않았습니다.")
        return

    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    except Exception as e:
        print(f"Supabase 클라이언트 생성 실패: {e}")
        return
        
    SERVICE_NAME = "FsaCrtfcUpsoMgtNew" 


    
    def fetch_all_data_from_api(api_key, service):
        all_rows = []
        page_size = 1000  
        
        try:
            url = f"http://openapi.seoul.go.kr:8088/{api_key}/json/{service}/1/1/"
            response = requests.get(url)
            response.raise_for_status() 
            data = response.json()
            
            total_count = int(data[service]["list_total_count"])
            print(f"총 {total_count}개의 업소 데이터를 발견했습니다.")
            
        except Exception as e:
            print(f"API 전체 개수 파악 실패: {e}")
            return None

        for start_index in range(1, total_count + 1, page_size):
            end_index = start_index + page_size - 1
            if end_index > total_count:
                end_index = total_count
                
            print(f"{start_index} ~ {end_index} ({end_index}/{total_count}) 데이터 가져오는 중")
            
            try:
                url = f"http://openapi.seoul.go.kr:8088/{api_key}/json/{service}/{start_index}/{end_index}/"
                response = requests.get(url)
                response.raise_for_status()
                data = response.json()
                
                batch_data = data[service].get("row", []) 
                if batch_data:
                    all_rows.extend(batch_data)
            except Exception as e:
                print(f"{start_index}~{end_index} 구간 API 호출 실패: {e}")
                
        return all_rows

    def clean_value(val):
        if pd.isna(val):
            return None
        try:
            if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
                return None
        except:
            pass
        if val == '':
            return None
        return val

    print("서울시 식품인증업소 API 데이터 업로드를 시작합니다.")
    
    api_rows = fetch_all_data_from_api(SEOUL_API_KEY, SERVICE_NAME)

    if not api_rows:
        print("API로부터 데이터를 가져오지 못했습니다. 스크립트를 종료합니다.")
        return

    df = pd.DataFrame(api_rows)
    print("API 데이터를 DataFrame으로 변환 완료.")

    FILTER_COLUMN_NAME = 'COB_CODE' 

    try:
        filtered = df[df[FILTER_COLUMN_NAME].astype(str).isin(["101", "104"])].copy()
    except KeyError:
        print(f"'{FILTER_COLUMN_NAME}' 컬럼을 찾을 수 없습니다. API 응답이 변경되었을 수 있습니다.")
        return

    filtered = filtered.applymap(clean_value)

    records = []
    for _, row in filtered.iterrows():
        record = {
            "name": row.get("UPSO_NM", ""),                   # (명세표 12) 업소명
            "address": row.get("RDN_DETAIL_ADDR") or \
                       row.get("RDN_CODE_NM") or "",          # (명세표 18, 19) 주소
            "phone": row.get("TEL_NO", ""),                   # (명세표 16) 전화번호
            "latitude": clean_value(row.get("Y_DNTS")),       # (명세표 14) y좌표
            "longitude": clean_value(row.get("X_CNTS")),      # (명세표 15) x좌표
            "category": str(row.get(FILTER_COLUMN_NAME, "")), # (명세표 8) 업종코드
            "data_source": "서울특별시 식품인증업소 관리", 
        }
        records.append(record)


    if records:
        print(f"Uploading {len(records)} vegan restaurants...")
        try:
            batch_size = 50
            for i in range(0, len(records), batch_size):
                batch = records[i:i+batch_size]
                supabase.table("restaurants").insert(batch).execute()
            print("Upload complete.")
        except Exception as e:
            print("Error during upload:", e)
    else:
        print(f"No vegan restaurants (code 101/104, column '{FILTER_COLUMN_NAME}') found in API data.")
    
    print("업로드 작업 완료.")


if __name__ == "__main__":
    upload_from_api()