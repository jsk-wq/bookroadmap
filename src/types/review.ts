export interface BookstoreReview {
  id: string;
  bookstore_id: string;
  author_name: string;
  rating: number;
  content: string;
  created_at: string;
}

export interface NewBookstoreReview {
  bookstore_id: string;
  author_name: string;
  rating: number;
  content: string;
}
