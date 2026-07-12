export type Article = {
  id: string;
  title: string;
  sourceId: string;
  sourceName: string;
  summary: string;
  url: string;
  publishedAt?: string;
};

export type FetchResult = {
  articles: Article[];
  errors: Array<{ adapter: string; message: string }>;
  meta: { fetchedAt: string };
};

export type SummaryResult = {
  one_sentence: string;
  key_points: string[];
  why_it_matters: string;
  follow_up_questions: string[];
};
