export function parsePagination(query) {
  const page  = Math.max(1, parseInt(query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function paginatedResponse(res, { data, total, page, limit }) {
  const totalPages = Math.ceil(total / limit);
  res.json({
    ok: true,
    data,
    meta: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  });
}
