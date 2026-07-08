"use client";

import { FormEvent, useEffect, useState } from "react";
import { createBookstoreReview, fetchBookstoreReviews, hasReviewDatabase } from "@/lib/reviews";
import type { BookstoreReview } from "@/types/review";

interface BookstoreReviewsProps {
  bookstoreId: string;
  bookstoreName: string;
}

const RATING_OPTIONS = [5, 4, 3, 2, 1];

export default function BookstoreReviews({ bookstoreId, bookstoreName }: BookstoreReviewsProps) {
  const [reviews, setReviews] = useState<BookstoreReview[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const databaseReady = hasReviewDatabase();

  useEffect(() => {
    let cancelled = false;

    async function loadReviews() {
      if (!databaseReady) return;

      setLoading(true);
      setError(null);

      try {
        const nextReviews = await fetchBookstoreReviews(bookstoreId);
        if (!cancelled) setReviews(nextReviews);
      } catch (reviewError) {
        if (!cancelled) {
          setError(reviewError instanceof Error ? reviewError.message : "리뷰를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setReviews([]);
    loadReviews();

    return () => {
      cancelled = true;
    };
  }, [bookstoreId, databaseReady]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!authorName.trim() || !content.trim()) {
      setError("이름과 리뷰 내용을 모두 입력해 주세요.");
      return;
    }

    setSubmitting(true);

    try {
      const review = await createBookstoreReview({
        bookstore_id: bookstoreId,
        author_name: authorName,
        rating,
        content,
      });

      setReviews((current) => [review, ...current]);
      setAuthorName("");
      setRating(5);
      setContent("");
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "리뷰를 저장하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-5 border-t border-ink-100 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-ink-900">방문 리뷰</h3>
          <p className="mt-1 text-xs text-ink-500">
            {bookstoreName}에 다녀온 기억을 짧게 남겨보세요.
          </p>
        </div>
        <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-600">
          {reviews.length}개
        </span>
      </div>

      {!databaseReady ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          리뷰 데이터베이스 연결 전입니다. Supabase 프로젝트를 만들고
          <code className="mx-1 rounded bg-white/70 px-1">NEXT_PUBLIC_SUPABASE_URL</code>
          <code className="rounded bg-white/70 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
          를 등록하면 리뷰 기능이 켜집니다.
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="mt-4 grid gap-3 rounded-xl bg-ink-50 p-4">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-ink-600">이름</span>
                <input
                  type="text"
                  value={authorName}
                  onChange={(event) => setAuthorName(event.target.value)}
                  maxLength={40}
                  placeholder="닉네임"
                  className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-ink-400 transition focus:ring-2"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-ink-600">별점</span>
                <select
                  value={rating}
                  onChange={(event) => setRating(Number(event.target.value))}
                  className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-ink-400 transition focus:ring-2"
                >
                  {RATING_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}점
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-ink-600">리뷰</span>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="분위기, 큐레이션, 다시 가고 싶은 이유를 남겨주세요."
                className="resize-none rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-ink-400 transition focus:ring-2"
              />
            </label>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-ink-400">{content.length}/1000</span>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-ink-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-700 disabled:cursor-not-allowed disabled:bg-ink-300"
              >
                {submitting ? "저장 중..." : "리뷰 남기기"}
              </button>
            </div>
          </form>

          {error && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mt-4 grid gap-3">
            {loading ? (
              <p className="text-sm text-ink-500">리뷰를 불러오는 중...</p>
            ) : reviews.length === 0 ? (
              <p className="rounded-xl border border-dashed border-ink-200 px-4 py-5 text-center text-sm text-ink-500">
                아직 남겨진 리뷰가 없습니다.
              </p>
            ) : (
              reviews.map((review) => (
                <article key={review.id} className="rounded-xl border border-ink-100 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-ink-900">{review.author_name}</p>
                    <div className="flex items-center gap-2 text-xs text-ink-500">
                      <span>{"★".repeat(review.rating)}</span>
                      <span>{new Date(review.created_at).toLocaleDateString("ko-KR")}</span>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink-700">
                    {review.content}
                  </p>
                </article>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}
