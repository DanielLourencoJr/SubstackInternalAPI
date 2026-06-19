# Substack Internal API — Endpoint Reference

> Quick-reference tables. See [API_REFERENCE.md](API_REFERENCE.md) for detailed docs with JSON examples.

## Conventions

| Prefix | Scope | Base URL |
|--------|-------|----------|
| `{pub}` | Publication | `https://{pub}.substack.com/api/v1` |
| (none)  | Platform  | `https://substack.com/api/v1` |

**Auth**: All endpoints use `Cookie: substack.sid=<session>` as the sole credential (see [AUTH.md](AUTH.md)).

---

## Platform Endpoints (`substack.com/api/v1`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/user/{handle}/public_profile` | ❌ No | Public profile by handle |
| GET | `/profile/posts?profile_user_id={id}&limit={n}` | ❌ No | Published posts for a user (all their publications). Paginated. |
| GET | `/posts/by-id/{id}` | ❌ No | Single published post with full `body_html` |
| GET | `/reader/feed` | ❌ No | Notes feed, paginated |
| GET | `/reader/comment/{id}` | ❌ No | Read a single note/comment by ID |
| GET | `/feed/following` | ✅ Yes | Following feed (posts from publications you follow) |
| GET | `/handle/options` | ✅ Yes | Available handles/slugs for the authenticated user |
| GET | `/user/profile/self` | ✅ Yes | Own profile, publication list, user ID |
| GET | `/user-settings` | ✅ Yes | User settings (key-value store) |
| POST | `/comment/feed/` | ✅ Yes | Create a note (ProseMirror JSON body). Use `attachmentIds` to embed images or restack posts/notes. `bodyJson` is optional when using attachments. |
| DELETE | `/comment/{id}` | ✅ Yes | Delete a note (platform scope). For post comments, use publication scope. |
| POST | `/comment/attachment/` | ✅ Yes | Resolve a URL to an attachment UUID. `type: "link"` for restacking, `type: "image"` for image attachments in notes. |
| POST | `/restack/{postId}` | ✅ Yes | Cross-post a post to another publication |
| POST | `/post/{postId}/reaction` | ✅ Yes | Like/unlike a post. `{reaction: "❤"}`. Only ❤ accepted. Toggles. |
| POST | `/comment/{id}/reaction` | ✅ Yes | Like/unlike a note/comment. |

---

## Publication Endpoints (`{pub}.substack.com/api/v1`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/publication` | ✅ Yes | Publication info (name, logo, custom domain, etc.) |
| GET | `/publication/sections` | ✅ Yes | Sections/categories |
| GET | `/publication/settings` | ✅ Yes | Publication settings (may 403 for non-admins) |
| GET | `/drafts` | ✅ Yes | All content (drafts + published), paginated |
| GET | `/drafts/{id}` | ✅ Yes | Single draft by ID |
| POST | `/drafts` | ✅ Yes | Create a draft (Tiptap JSON body) |
| PUT | `/drafts/{id}` | ✅ Yes | Update a draft |
| DELETE | `/drafts/{id}` | ✅ Yes | Delete a draft |
| POST | `/drafts/{id}/publish` | ✅ Yes | Publish a draft |
| POST | `/image` | ✅ Yes | Upload image (form-urlencoded, Base64 data URI) |
| GET | `/notes` | ✅ Yes | Notes feed for the publication, paginated |
| POST | `/post/{postId}/comment` | ✅ Yes | Create a comment on a post. Optional `ancestorPath` for replies. |
| GET | `/post/{postId}/comments` | ✅ Yes | List all comments on a post |
| DELETE | `/comment/{id}` | ✅ Yes | Delete a comment on a post (publication scope only) |

---

## Auth Matrix Summary

- **Publication scope**: All endpoints require auth → 403 without cookie.
- **Platform scope**, public reads: No auth needed.
- **Platform scope**, writes/personalized: Auth required.
