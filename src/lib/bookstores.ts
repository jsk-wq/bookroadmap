import type { Bookstore, BookstoreApiItem, BookstoreApiResponse } from "@/types/bookstore";

const API_BASE = "http://api.kcisa.kr/openapi/API_CIA_089/request";
const PAGE_SIZE = 100;
const API_ITEM_FIELDS: (keyof BookstoreApiItem)[] = [
  "TITLE",
  "ADDRESS",
  "COORDINATES",
  "CONTACT_POINT",
  "DESCRIPTION",
  "SUB_DESCRIPTION",
  "SUBJECT_KEYWORD",
];

function normalizeItems(
  item: BookstoreApiItem | BookstoreApiItem[] | undefined,
): BookstoreApiItem[] {
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

export function extractRegion(address: string): string {
  const trimmed = address.trim();
  if (!trimmed) return "기타";

  const specialMatch = trimmed.match(
    /^(서울|부산|대구|인천|광주|대전|울산|세종)(?:특별?시|광역시|특별자치시)?/,
  );
  if (specialMatch) return specialMatch[1];

  const provinceMatch = trimmed.match(
    /^(경기|강원|충북|충남|전북|전남|경북|경남|제주)(?:특별?자치?도|도)?/,
  );
  if (provinceMatch) return provinceMatch[1];

  return "기타";
}

export function mapApiItemToBookstore(item: BookstoreApiItem, index: number): Bookstore | null {
  const coordinates = item.COORDINATES?.split(",").map((value) => value.trim()) ?? [];
  const lat = Number(coordinates[0]);
  const lng = Number(coordinates[1]);

  if (!item.TITLE || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }

  const address = item.ADDRESS ?? "";

  return {
    id: `${item.TITLE}-${address}-${index}`,
    name: item.TITLE,
    address,
    lat,
    lng,
    phone: item.CONTACT_POINT ?? "",
    hours: item.DESCRIPTION ?? "",
    description: item.SUB_DESCRIPTION ?? "",
    keywords: item.SUBJECT_KEYWORD ?? "",
    region: extractRegion(address),
  };
}

function decodeXmlEntity(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&")
    .trim();
}

function readXmlTag(xml: string, tagName: string): string {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? decodeXmlEntity(match[1]) : "";
}

function parseXmlBookstoreResponse(xml: string): BookstoreApiResponse {
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  const items = itemMatches.map((itemXml) => {
    const item: BookstoreApiItem = {};

    for (const field of API_ITEM_FIELDS) {
      const value = readXmlTag(itemXml, field);
      if (value) item[field] = value;
    }

    return item;
  });

  return {
    response: {
      header: {
        resultCode: readXmlTag(xml, "resultCode"),
        resultMsg: readXmlTag(xml, "resultMsg"),
      },
      body: {
        totalCount: readXmlTag(xml, "totalCount") || items.length,
        numOfRows: readXmlTag(xml, "numOfRows"),
        pageNo: readXmlTag(xml, "pageNo"),
        items: {
          item: items,
        },
      },
    },
  };
}

function parseBookstoreResponse(text: string): BookstoreApiResponse {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error("독립서점 API 응답이 비어 있습니다.");
  }

  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed) as BookstoreApiResponse;
  }

  if (trimmed.startsWith("<")) {
    return parseXmlBookstoreResponse(trimmed);
  }

  throw new Error(`독립서점 API 응답 형식을 확인할 수 없습니다: ${trimmed.slice(0, 80)}`);
}

async function fetchPage(serviceKey: string, pageNo: number): Promise<BookstoreApiResponse> {
  const params = new URLSearchParams({
    serviceKey,
    pageNo: String(pageNo),
    numOfRows: String(PAGE_SIZE),
    type: "json",
  });

  const response = await fetch(`${API_BASE}?${params.toString()}`, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`독립서점 API 요청 실패: HTTP ${response.status}`);
  }

  return parseBookstoreResponse(await response.text());
}

export async function fetchAllBookstores(serviceKey: string): Promise<Bookstore[]> {
  const firstPage = await fetchPage(serviceKey, 1);
  const header = firstPage.response.header;
  const isSuccess =
    header.resultCode === "0000" ||
    header.resultCode === "0" ||
    header.resultMsg === "NORMAL_SERVICE" ||
    header.resultMsg === "NORMAL SERVICE";

  if (!isSuccess) {
    throw new Error(`독립서점 API 오류: ${header.resultMsg} (${header.resultCode})`);
  }

  const totalCount = Number(firstPage.response.body.totalCount);
  const bookstores: Bookstore[] = [];
  let index = 0;

  for (const item of normalizeItems(firstPage.response.body.items?.item)) {
    const mapped = mapApiItemToBookstore(item, index++);
    if (mapped) bookstores.push(mapped);
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  for (let pageNo = 2; pageNo <= totalPages; pageNo += 1) {
    const page = await fetchPage(serviceKey, pageNo);
    for (const item of normalizeItems(page.response.body.items?.item)) {
      const mapped = mapApiItemToBookstore(item, index++);
      if (mapped) bookstores.push(mapped);
    }
  }

  return bookstores;
}

export function filterBookstores(
  bookstores: Bookstore[],
  query: {
    search?: string;
    region?: string;
    keyword?: string;
  },
): Bookstore[] {
  const search = query.search?.trim().toLowerCase() ?? "";
  const region = query.region?.trim() ?? "전체";
  const keyword = query.keyword?.trim().toLowerCase() ?? "";

  return bookstores.filter((store) => {
    const matchesRegion = region === "전체" || store.region === region;
    const matchesSearch =
      !search ||
      store.name.toLowerCase().includes(search) ||
      store.address.toLowerCase().includes(search) ||
      store.keywords.toLowerCase().includes(search);
    const matchesKeyword =
      !keyword ||
      store.keywords.toLowerCase().includes(keyword) ||
      store.description.toLowerCase().includes(keyword);

    return matchesRegion && matchesSearch && matchesKeyword;
  });
}

export function collectKeywordOptions(bookstores: Bookstore[]): string[] {
  const keywords = new Set<string>();

  for (const store of bookstores) {
    for (const part of store.keywords.split(",")) {
      const value = part.trim();
      if (value) keywords.add(value);
    }
  }

  return Array.from(keywords).sort((a, b) => a.localeCompare(b, "ko"));
}
