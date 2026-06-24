# Substack Internal API Reference

> Reverse-engineered from live testing against a test account. Covers the undocumented internal HTTP API used by the Substack web app.
>
> See [`AGENTS.md`](AGENTS.md) for repo conventions and testing workflow.

## Files

| File | Contents |
|------|----------|
| [`AUTH.md`](AUTH.md) | Authentication, base URLs, auth matrix, session cookie |
| [`ENDPOINTS.md`](ENDPOINTS.md) | Quick-reference table of all 25 endpoints with auth column |
| [`API_REFERENCE.md`](API_REFERENCE.md) | Detailed endpoint documentation with JSON examples |
| [`CONTENT_FORMATS.md`](CONTENT_FORMATS.md) | Tiptap (drafts) vs ProseMirror (notes) JSON document formats |
| [`LIMITS.md`](LIMITS.md) | Rate limits (~60 req/min global) and size limits (~976 KB draft body) |

## Quick Start

```js
const COOKIE = 'substack.sid=s%3A<session>.<signature>';

// Create a note
await fetch('https://substack.com/api/v1/comment/feed/', {
  method: 'POST',
  headers: { Cookie: COOKIE, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bodyJson: { type: 'doc', attrs: { schemaVersion: 'v1' },
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] },
    tabId: 'for-you', surface: 'feed', replyMinimumRole: 'everyone'
  })
});

// Restack a post
const att = await fetch('https://substack.com/api/v1/comment/attachment/', {
  method: 'POST', headers: { Cookie: COOKIE, 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://{pub}.substack.com/p/{slug}', type: 'link' })
}).then(r => r.json());

await fetch('https://substack.com/api/v1/comment/feed/', {
  method: 'POST', headers: { Cookie: COOKIE, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bodyJson: { type: 'doc', attrs: { schemaVersion: 'v1' },
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'My thoughts' }] }] },
    tabId: 'for-you', surface: 'feed', replyMinimumRole: 'everyone',
    attachmentIds: [att.id]
  })
});

// Like something
await fetch('https://substack.com/api/v1/post/{id}/reaction', {
  method: 'POST', headers: { Cookie: COOKIE, 'Content-Type': 'application/json' },
  body: JSON.stringify({ reaction: '❤' })
});
```

## Key Facts

- **Auth**: `substack.sid` cookie alone. No `connect.sid`, no CSRF tokens, no special User-Agent.
- **Two scopes**: Platform (`substack.com/api/v1`) and Publication (`{pub}.substack.com/api/v1`).
- **Rate limit**: Global sliding window, ~60 req/min. 1 req/sec is safe. No rate-limit headers.
- **Formats**: Tiptap (drafts: `strong`/`em`/`image2`) vs ProseMirror (notes: `bold`/`italic`).
- **Notes** cannot embed images inline (no `image2` in body JSON), but **images can be attached** as cards via `POST /comment/attachment/` with `type: "image"` — see [API_REFERENCE.md#image-attachment-workflow](API_REFERENCE.md).
- **Reactions**: Only `❤` is supported (no `🔥`, `👍`, etc.).
- **Delete scoping**: Notes delete via platform scope; post comments delete via publication scope.
- **Note replies**: Create via `POST /comment/feed/` with `parent_id: <noteId>` (number). Read via `GET /reader/comment/{id}/replies` (no auth). Profile feed excludes replies — they don't appear in `reader/feed/profile/{id}`. No endpoint to enumerate ALL of a user's replies.
