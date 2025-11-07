# 1. 베이스 이미지 (Python 3.10)
FROM python:3.10-slim

# 2. 작업 디렉토리 설정
WORKDIR /app

# 3. 의존성 파일 먼저 복사
COPY requirements.txt .

# 4. 의존성 설치
RUN pip install --no-cache-dir -r requirements.txt

# 5. 백엔드 소스코드 전체 복사
COPY . .

# 6. 백엔드 서버 포트 5000번 노출
EXPOSE 5000

# 7. 서버 실행
CMD ["python", "-m", "app.main"]