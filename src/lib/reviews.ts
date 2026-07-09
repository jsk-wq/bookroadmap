import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { BookstoreReview, NewBookstoreReview } from "@/types/review";

const STORAGE_KEY = "bookroadmap-bookstore-reviews";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export type ReviewStorageMode = "supabase" | "local" | "unavailable";

let supabase: SupabaseClient | null = null;
let storageMode: ReviewStorageMode | null = null;

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  supabase ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabase;
}

function readLocalReviews(): Record<string, BookstoreReview[]> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, BookstoreReview[]>;
  } catch {
    return {};
  }
}

function writeLocalReviews(allReviews: Record<string, BookstoreReview[]>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(allReviews));
}

function fetchLocalReviews(bookstoreId: string) {
  const allReviews = readLocalReviews();
  return (allReviews[bookstoreId] ?? []).sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );
}

function createLocalReview(review: NewBookstoreReview) {
  const nextReview: BookstoreReview = {
    id: crypto.randomUUID(),
    bookstore_id: review.bookstore_id,
    author_name: review.author_name.trim(),
    rating: review.rating,
    content: review.content.trim(),
    created_at: new Date().toISOString(),
  };

  const allReviews = readLocalReviews();
  const storeReviews = allReviews[review.bookstore_id] ?? [];
  allReviews[review.bookstore_id] = [nextReview, ...storeReviews];
  writeLocalReviews(allReviews);

  return nextReview;
}

function isMissingTableError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "PGRST205" || error.message?.includes("bookstore_reviews");
}

async function resolveStorageMode() {
  if (storageMode !== null) return storageMode;

  const client = getSupabase();
  if (!client) {
    storageMode = "local";
    return storageMode;
  }

  const { error } = await client.from("bookstore_reviews").select("id").limit(1);
  storageMode = !error || !isMissingTableError(error) ? "supabase" : "local";
  return storageMode;
}

export async function getReviewStorageMode() {
  return resolveStorageMode();
}

export function validateBookstoreReviewInput(review: NewBookstoreReview) {
  const authorName = review.author_name.trim();
  const content = review.content.trim();

  if (!authorName) {
    return "이름을 입력해 주세요.";
  }

  if (authorName.length > 40) {
    return "이름은 40자 이하로 입력해 주세요.";
  }

  if (!content) {
    return "리뷰 내용을 입력해 주세요.";
  }

  if (content.length < 2) {
    return "리뷰 내용은 2자 이상 입력해 주세요.";
  }

  if (content.length > 1000) {
    return "리뷰 내용은 1000자 이하로 입력해 주세요.";
  }

  if (!Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) {
    return "별점은 1점에서 5점 사이로 선택해 주세요.";
  }

  return null;
}

export async function fetchBookstoreReviews(bookstoreId: string) {
  if ((await resolveStorageMode()) !== "supabase") {
    return fetchLocalReviews(bookstoreId);
  }

  const client = getSupabase();
  if (!client) return fetchLocalReviews(bookstoreId);

  const { data, error } = await client
    .from("bookstore_reviews")
    .select("id, bookstore_id, author_name, rating, content, created_at")
    .eq("bookstore_id", bookstoreId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (isMissingTableError(error)) {
      storageMode = "local";
      return fetchLocalReviews(bookstoreId);
    }

    throw new Error("리뷰를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  return (data ?? []) as BookstoreReview[];
}

export async function createBookstoreReview(review: NewBookstoreReview) {
  const validationError = validateBookstoreReviewInput(review);
  if (validationError) {
    throw new Error(validationError);
  }

  const payload = {
    bookstore_id: review.bookstore_id,
    author_name: review.author_name.trim(),
    rating: review.rating,
    content: review.content.trim(),
  };

  if ((await resolveStorageMode()) === "supabase") {
    const client = getSupabase();
    if (client) {
      const { data, error } = await client
        .from("bookstore_reviews")
        .insert(payload)
        .select("id, bookstore_id, author_name, rating, content, created_at")
        .single();

      if (!error) return data as BookstoreReview;

      if (isMissingTableError(error)) {
        storageMode = "local";
        return createLocalReview(review);
      }

      throw new Error("리뷰를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  return createLocalReview(review);
}
