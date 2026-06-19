# Rate Limits & Size Limits

---

## Rate Limits

### Global Endpoint Rate Limit

- **Type**: Sliding window (global, shared across all endpoints)
- **Burst**: ~60 requests per minute (tested: 41 rapid-fire requests triggered 429)
- **Sustained**: ~1 request per second indefinitely safe
- **Error signal**: HTTP `429 Too Many Requests` with no body
- **Retry-after**: No `Retry-After` header is returned
- **Headers**: No rate-limit headers (`X-RateLimit-*`) are sent

### Image Upload Rate Limit

- **Independent limit**: ~10 rapid uploads before hitting 429
- **Workaround**: 200ms delay between consecutive image uploads avoids the limit

### Testing Notes

The rate limit was verified by sending rapid sequential requests. At ~41 requests in quick succession the 429 was triggered. With a 1-second delay between requests, the limit was never hit over extended testing.

No `X-RateLimit-Remaining`, `X-RateLimit-Reset`, or similar headers are present in any response.

---

## Size Limits

### Draft Body (`draft_body`)

| Limit | Value |
|-------|-------|
| Maximum size | ~1,000,000 bytes (~976 KB) |
| Signal | `HTTP 400` with `{"param": "draft_body"}` |
| Scope | Applies to both `POST /drafts` and `PUT /drafts/{id}` |

The size is checked on the raw JSON-serialized `draft_body` field. Exceeding it returns a 400 with the field name in the response.

### Note Body (`bodyJson`)

No explicit size limit was hit during testing. Notes are expected to be significantly shorter than drafts.

---

## Practical Guidelines

| Usage | Safe Rate |
|-------|-----------|
| Reading (GET requests) | 1 req/sec sustained, ~50 req/min burst |
| Writing (POST/PUT) | 1 req/sec sustained |
| Image uploads | 5 uploads/sec with 200ms spacing |
| Mixed workloads | Stay under 1 req/sec average for long-running tasks |
