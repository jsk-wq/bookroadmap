import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { BookstoreReview, NewBookstoreReview } from "@/types/review";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

export function hasReviewDatabase() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  supabase ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabase;
}

export async function fetchBookstoreReviews(bookstoreId: string) {
  const client = getSupabase();
  if (!client) return [];

  const { data, error } = await client
    .from("bookstore_reviews")
    .select("id, bookstore_id, author_name, rating, content, created_at")
    .eq("bookstore_id", bookstoreId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return (data ?? []) as BookstoreReview[];
}

export async function createBookstoreReview(review: NewBookstoreReview) {
  const client = getSupabase();
  if (!client) throw new Error("리뷰 데이터베이스가 아직 연결되지 않았습니다.");

  const payload = {
    bookstore_id: review.bookstore_id,
    author_name: review.author_name.trim(),
    rating: review.rating,
    content: review.content.trim(),
  };

  const { data, error } = await client
    .from("bookstore_reviews")
    .insert(payload)
    .select("id, bookstore_id, author_name, rating, content, created_at")
    .single();

  if (error) throw new Error(error.message);

  return data as BookstoreReview;
}
