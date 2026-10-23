const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Parse and validate pagination parameters with a maximum limit
export function parsePagination(query = {}) {
  const requestedPage = parseInt(query.page, 10);
  const requestedLimit = parseInt(query.limit, 10);

  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const limit =
    Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, MAX_LIMIT) : DEFAULT_LIMIT;

  return { page, limit, skip: (page - 1) * limit };
}

// Generate metadata for paginated responses
export function buildPageMeta({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}
