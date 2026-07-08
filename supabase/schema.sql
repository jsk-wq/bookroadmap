create extension if not exists pgcrypto;

create table if not exists public.bookstore_reviews (
  id uuid primary key default gen_random_uuid(),
  bookstore_id text not null,
  author_name text not null check (char_length(trim(author_name)) between 1 and 40),
  rating smallint not null check (rating between 1 and 5),
  content text not null check (char_length(trim(content)) between 2 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists bookstore_reviews_bookstore_created_idx
  on public.bookstore_reviews (bookstore_id, created_at desc);

alter table public.bookstore_reviews enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert on public.bookstore_reviews to anon, authenticated;

drop policy if exists "Anyone can read bookstore reviews" on public.bookstore_reviews;
create policy "Anyone can read bookstore reviews"
  on public.bookstore_reviews
  for select
  using (true);

drop policy if exists "Anyone can create bookstore reviews" on public.bookstore_reviews;
create policy "Anyone can create bookstore reviews"
  on public.bookstore_reviews
  for insert
  with check (
    char_length(trim(author_name)) between 1 and 40
    and rating between 1 and 5
    and char_length(trim(content)) between 2 and 1000
  );
