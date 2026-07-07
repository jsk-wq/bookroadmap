"use client";

import type { Bookstore } from "@/types/bookstore";
import { KOREAN_REGIONS } from "@/types/bookstore";

interface BookstoreSidebarProps {
  bookstores: Bookstore[];
  filteredBookstores: Bookstore[];
  selectedId: string | null;
  search: string;
  searchActive: boolean;
  region: string;
  keyword: string;
  keywordOptions: string[];
  loading: boolean;
  error: string | null;
  fetchedAt: string | null;
  onSearchChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onSelect: (id: string) => void;
}

export default function BookstoreSidebar({
  bookstores,
  filteredBookstores,
  selectedId,
  search,
  searchActive,
  region,
  keyword,
  keywordOptions,
  loading,
  error,
  fetchedAt,
  onSearchChange,
  onRegionChange,
  onKeywordChange,
  onSelect,
}: BookstoreSidebarProps) {
  return (
    <aside className="flex h-full flex-col gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-500">
          Independent Bookstores
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-ink-900">전국 독립서점 지도</h1>
        <p className="mt-2 text-sm leading-6 text-ink-600">
          문화체육관광부 문화공공데이터광장 API 기반으로 전국 독립서점 위치와 운영 정보를
          확인할 수 있습니다.
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-ink-600">검색</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="서점명, 주소, 키워드"
            className="rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 text-sm outline-none ring-ink-400 transition focus:bg-white focus:ring-2"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-ink-600">지역</span>
            <select
              value={region}
              onChange={(event) => onRegionChange(event.target.value)}
              className="rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 text-sm outline-none ring-ink-400 transition focus:bg-white focus:ring-2"
            >
              {KOREAN_REGIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-ink-600">키워드</span>
            <select
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              className="rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 text-sm outline-none ring-ink-400 transition focus:bg-white focus:ring-2"
            >
              <option value="">전체</option>
              {keywordOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center justify-between text-xs text-ink-500">
          <span>
            {loading
              ? "데이터 불러오는 중..."
              : searchActive
                ? `검색 결과 ${filteredBookstores.length}곳 / 전체 ${bookstores.length}곳`
                : `전체 ${bookstores.length}곳`}
          </span>
          {fetchedAt && <span>{new Date(fetchedAt).toLocaleString("ko-KR")} 갱신</span>}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {searchActive ? (
        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
          <ul className="h-full overflow-y-auto">
            {filteredBookstores.length === 0 && !loading ? (
              <li className="px-4 py-8 text-center text-sm text-ink-500">
                조건에 맞는 독립서점이 없습니다.
              </li>
            ) : (
              filteredBookstores.map((store) => {
                const active = store.id === selectedId;

                return (
                  <li key={store.id} className="border-b border-ink-100 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => onSelect(store.id)}
                      className={`w-full px-4 py-3 text-left transition ${
                        active ? "bg-ink-100" : "hover:bg-ink-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-ink-900">{store.name}</p>
                          <p className="mt-1 text-sm text-ink-600">{store.address}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-ink-100 px-2 py-1 text-xs text-ink-600">
                          {store.region}
                        </span>
                      </div>
                      {store.keywords && (
                        <p className="mt-2 line-clamp-2 text-xs text-ink-500">{store.keywords}</p>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white/70 px-4 py-6 text-center text-sm text-ink-500">
          서점명, 주소, 키워드를 검색하면 결과 목록이 표시됩니다.
        </div>
      )}
    </aside>
  );
}
