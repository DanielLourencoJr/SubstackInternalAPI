# SubstackInternalAPI — Agent Guide

## Repo purpose

Reverse-engineered documentation of Substack's internal HTTP API. No code contributions to the three cloned repos (they are gitignored). Everything is raw Node.js fetch, no libraries.

## Key structure

| Path | Purpose |
|------|---------|
| `SUBSTACK_INTERNAL_API.md` | Index linking to all doc files |
| `AUTH.md` | Auth: only `substack.sid` cookie needed |
| `API_REFERENCE.md` | Detailed endpoint docs with JSON examples |
| `ENDPOINTS.md` | Quick-reference table (24 endpoints) |
| `CONTENT_FORMATS.md` | Tiptap (drafts) vs ProseMirror (notes) |
| `LIMITS.md` | Rate limits (~60 req/min), size limits (~976 KB draft body) |
| `tests/test_substack_api.mjs` | **Canary** — 37 tests, all endpoints covered |
| `substack-api-repo/` | Cloned TS lib (reference only, gitignored) |
| `substack-gateway-oss/` | Cloned Python gateway (reference only, gitignored) |
| `obsidian-content-publisher/` | Cloned plugin (reference only, gitignored) |

## Commands

```sh
# Run the full regression suite (all 37 tests, ~2.5 min)
node tests/test_substack_api.mjs

# Run a standalone publish script
node tests/publish_draft.cjs <draftId>

# Test large drafts with embedded images
node tests/test_large_draft.cjs
```

## Before running tests

The session cookie (`substack.sid`) in `tests/test_substack_api.mjs` **expires**. Get a fresh one:
1. Browser → DevTools → Application → Cookies → `substack.sid` (logged into `danielloureno`)
2. Paste the value into the `SID` const at the top of the test file

## API conventions

- **Two scopes**: Platform (`substack.com/api/v1`) and publication (`{pub}.substack.com/api/v1`)
- **Auth**: `Cookie: substack.sid=<session>` alone. No CSRF token, no `Authorization` header.
- **Rate limit**: Global sliding window ~60 req/min. 1 req/sec safe. Add 2s delay between requests. No rate-limit headers returned. Only signal is HTTP 429.
- **Image upload**: Only endpoint using `application/x-www-form-urlencoded`. Independent rate limit (~10 rapid uploads).
- **Draft field names**: use `draft_title`, `draft_subtitle`, `draft_body` (not `title`, `subtitle`). Include `draft_bylines: []`.
- **Notes body_json**: ProseMirror format (marks: `bold`/`italic`, NOT `strong`/`em`). No inline images (`image2` rejected). Attach images via `POST /comment/attachment/` with `type: "image"`.
- **Attachment UUIDs**: single-use. Reuse returns 400.
- **Content format**: Tiptap (`strong`, `em`, `image2`) for drafts; ProseMirror (`bold`, `italic`) for notes.
- **Delete scoping**: Notes delete via platform scope; post comments delete via publication scope.

## Discovery testing

When investigating unknown endpoints, use inline `node -e '...'` scripts. Test auth-optional endpoints without cookie first. Always include the same `User-Agent` header the web app sends.

## Rules

- Never modify the three cloned repos (`substack-api-repo/`, `substack-gateway-oss/`, `obsidian-content-publisher/`)
- Document all endpoint discoveries in the markdown files before committing
- Clean up test artifacts (notes, drafts, comments) after testing — the test suite does this automatically via `[99] Cleanup`
- Keep `AGENTS.md` updated as new API behaviors are discovered
