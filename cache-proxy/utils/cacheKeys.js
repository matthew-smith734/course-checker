// Helpers that normalize comma-separated inputs so cache keys stay consistent even if the client varies formatting.
function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return String(value).split(',');
}

function normalizeSessions(raw) {
  return normalizeList(raw)
    .map((item) => item.trim().toUpperCase())
    .filter((item) => item.length > 0)
    .filter((item, idx, self) => self.indexOf(item) === idx)
    .sort();
}

// Build Redis cache key for GET search or POST course detail endpoints.
function buildCacheKey(req) {
  const method = req.method.toUpperCase();
  const path = req.path.replace(/^\/api\/?/, '');

  if (method === 'GET' && path.includes('getOptimizedMatchingCourseTitles')) {
    const term = (req.query.term || '').toString().trim().toUpperCase();
    const sessions = normalizeSessions(req.query.sessions);
    if (!term || sessions.length === 0) return undefined;
    return `titles:${term}:${sessions.join(',')}`;
  }

  if (method === 'POST' && path.includes('getPageableCourses')) {
    const courseCode = (req.body?.courseCodeAndTitleProps?.courseCode || '').toString().trim().toUpperCase();
    const sessions = normalizeSessions(req.body?.sessions);
    if (!courseCode || sessions.length === 0) return undefined;
    return `courses:${courseCode}:${sessions.join(',')}`;
  }

  return undefined;
}

module.exports = { buildCacheKey };
