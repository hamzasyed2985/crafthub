export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type PaginatedMeta = {
  total: number;
  page: number;
  limit: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginatedMeta;
};
