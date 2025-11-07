# --- 1단계: 빌드(Build) 환경 ---
FROM node:18-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# 의존성 파일 먼저 복사
COPY package.json package-lock.json ./

# 의존성 설치
RUN npm ci

# 프론트엔드 소스코드 전체 복사
COPY . .

# 프로덕션 빌드 실행
RUN npm run build

FROM nginx:1.25-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Nginx 실행
CMD ["nginx", "-g", "daemon off;"]