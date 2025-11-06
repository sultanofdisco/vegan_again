# 회원가입 API 요청 예시

## cURL 예시

```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!",
    "password_confirm": "Password123!",
    "nickname": "사용자",
    "profile_image_url": "https://example.com/profile.jpg",
    "bio": "안녕하세요! 비건을 실천하고 있습니다."
  }'
```

## JavaScript (fetch) 예시

```javascript
const signupData = {
  email: "user@example.com",
  password: "Password123!",
  password_confirm: "Password123!",
  nickname: "사용자",
  profile_image_url: "https://example.com/profile.jpg",
  bio: "안녕하세요! 비건을 실천하고 있습니다."
};

fetch('http://localhost:5000/api/auth/signup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(signupData)
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

## Python (requests) 예시

```python
import requests

signup_data = {
    "email": "user@example.com",
    "password": "Password123!",
    "password_confirm": "Password123!",
    "nickname": "사용자",
    "profile_image_url": "https://example.com/profile.jpg",
    "bio": "안녕하세요! 비건을 실천하고 있습니다."
}

response = requests.post(
    'http://localhost:5000/api/auth/signup',
    json=signup_data
)

print(response.json())
```

## 필수 필드

- `email`: 이메일 주소 (문자열, 최대 254자)
- `password`: 비밀번호 (문자열, 최소 8자, 대소문자/숫자/특수문자 중 2가지 이상 조합)
- `password_confirm`: 비밀번호 확인 (password와 동일해야 함)
- `nickname`: 닉네임 (문자열, 최대 50자)

## 선택 필드

- `profile_image_url`: 프로필 이미지 URL (문자열, 최대 2048자, http/https 프로토콜만 허용)
- `bio`: 소개 (문자열, 최대 500자)

## 최소 요청 예시 (필수 필드만)

```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "password_confirm": "Password123!",
  "nickname": "사용자"
}
```

## 성공 응답 예시 (201 Created)

```json
{
  "message": "회원가입이 완료되었습니다.",
  "user": {
    "user_id": 1,
    "email": "user@example.com",
    "nickname": "사용자",
    "profile_image_url": "https://example.com/profile.jpg",
    "bio": "안녕하세요! 비건을 실천하고 있습니다.",
    "oauth_provider": "self",
    "oauth_id": null,
    "created_at": "2024-01-01T12:00:00.000000",
    "updated_at": "2024-01-01T12:00:00.000000"
  }
}
```

## 에러 응답 예시 (400 Bad Request)

```json
{
  "error": "이메일, 비밀번호, 비밀번호 확인, 닉네임은 필수 항목입니다."
}
```

```json
{
  "error": "비밀번호는 대소문자, 숫자, 특수문자 중 2가지 이상 조합이 필요합니다."
}
```

