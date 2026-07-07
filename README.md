# 전국 독립서점 지도

문화체육관광부 [문화공공데이터광장 – 전국 독립서점 및 운영정보](https://www.culture.go.kr/data/openapi/openapiView.do?id=623) API와 카카오맵을 사용해 전국 독립서점을 지도에서 탐색하는 Next.js 앱입니다.

## 기능

- 전국 독립서점 데이터 자동 수집 (페이지네이션 처리)
- 카카오맵 마커 및 상세 정보 표시
- 서점명·주소·키워드 검색
- 지역·키워드 필터
- 서버 메모리 캐시 (1시간)

## 시작하기

### 1. API 키 발급

1. [문화공공데이터광장](https://www.culture.go.kr/data/main/main.do) 또는 [공공데이터포털](https://www.data.go.kr/data/15138901/openapi.do)에서 **전국 독립서점 및 운영정보** 활용신청
2. [Kakao Developers](https://developers.kakao.com)에서 JavaScript 키 발급
3. 카카오 개발자 콘솔 → 앱 → 플랫폼 → **Web** 도메인 등록
   - 로컬: `http://localhost:3000`
   - 배포 URL도 함께 등록

### 2. 환경변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 예시:

```env
CULTURE_API_KEY=발급받은_문화_API_키
NEXT_PUBLIC_KAKAO_MAP_APP_KEY=발급받은_카카오_JavaScript_키
```

### 3. 실행

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 프로젝트 구조

```text
src/
  app/
    api/bookstores/route.ts   # 독립서점 API 프록시 + 캐시
    page.tsx                  # 메인 페이지
  components/
    BookstoreExplorer.tsx     # 검색/필터/지도 통합 UI
    BookstoreMap.tsx          # 카카오맵
    BookstoreSidebar.tsx      # 목록 및 필터
  lib/bookstores.ts           # API 호출 및 데이터 변환
  types/                      # TypeScript 타입
```

## API 엔드포인트

- `GET /api/bookstores` — 전국 독립서점 JSON 반환

## 배포 시 참고

- Vercel 등에 `CULTURE_API_KEY`, `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` 환경변수 등록
- 카카오맵 Web 플랫폼에 배포 도메인 추가

## 데이터 출처

- 한국문화정보원_전국 독립서점 및 운영정보 (API_CIA_089)
