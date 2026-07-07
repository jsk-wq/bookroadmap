export interface Bookstore {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  hours: string;
  description: string;
  keywords: string;
  region: string;
}

export interface BookstoreApiItem {
  TITLE?: string;
  ADDRESS?: string;
  COORDINATES?: string;
  CONTACT_POINT?: string;
  DESCRIPTION?: string;
  SUB_DESCRIPTION?: string;
  SUBJECT_KEYWORD?: string;
}

export interface BookstoreApiResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      totalCount: string | number;
      numOfRows?: string | number;
      pageNo?: string | number;
      items?: {
        item?: BookstoreApiItem | BookstoreApiItem[];
      };
    };
  };
}

export interface BookstoresApiResult {
  bookstores: Bookstore[];
  totalCount: number;
  cached: boolean;
  fetchedAt: string;
}

export const KOREAN_REGIONS = [
  "전체",
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
] as const;

export type KoreanRegion = (typeof KOREAN_REGIONS)[number];
