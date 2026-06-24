# API Reference

> Detailed documentation for each endpoint. All endpoints succeed with `200` unless noted otherwise.

## Conventions

- **Platform**: `https://substack.com/api/v1`
- **Publication**: `https://{pub}.substack.com/api/v1`
- **Auth**: `Cookie: substack.sid=<session>` (see [AUTH.md](AUTH.md))
- **Content-Type**: `application/json` unless noted otherwise
- Test account handle: `danielloureno`

---

## Auth & Discovery

### GET `{platform}/user/{handle}/public_profile`

Public profile by handle. No auth required. This is the only endpoint that provides subscriber count data.

```json
{
  "id": 1234567,
  "name": "Daniel Lourenco",
  "handle": "danielloureno",
  "bio": "...",
  "avatar_url": "https://substackcdn.com/...",
  "twitter_screen_name": null,
  "is_pub_author": true,
  "publications": [
    {
      "id": 12345,
      "name": "The API Times",
      "subdomain": "theapitimes"
    }
  ],
  "rough_num_free_subscribers_int": 1,
  "rough_num_free_subscribers": "Tens",
  "subscriberCountString": "1 subscriber",
  "subscriberCount": "1",
  "subscriberCountNumber": 1,
  "followerCount": 0,
  "visibleSubscriptionsCount": 0,
  "subscriptions": []
}
```

Subscriber count fields:

| Field | Type | Description |
|-------|------|-------------|
| `rough_num_free_subscribers_int` | int | Rough free subscriber count (bucketed: 1, ~10, ~100, ~1000, etc.) |
| `rough_num_free_subscribers` | string | Human-readable bucket label: `"Tens"`, `"Hundreds"`, `"Thousands"`, etc. |
| `subscriberCountNumber` | int | Exact free subscriber count |
| `subscriberCountString` | string | Formatted string like `"1 subscriber"` |
| `subscriberCount` | string | Same as `subscriberCountNumber` as string |
| `followerCount` | int | Follower count (distinct from subscribers) |
| `visibleSubscriptionsCount` | int | Number of publications this user subscribes to that are publicly visible |
| `subscriptions` | array | List of publications the user subscribes to |
| `primaryPublicationSubscriptionState` | string | `"author"`, `"subscriber"`, or `"none"` |

No paid subscriber count is available through this or any other discovered endpoint.

### GET `{platform}/user/profile/self`

Own profile with full publication list. Auth required.

```json
{
  "id": 1234567,
  "name": "Daniel Lourenco",
  "handle": "danielloureno",
  "email": "daniel@example.com",
  "bio": "...",
  "avatar_url": "https://substackcdn.com/...",
  "publications": [
    { "id": 12345, "name": "The API Times", "subdomain": "theapitimes", "role": "admin" }
  ]
}
```

### GET `{platform}/handle/options`

Available handles/slugs for the authenticated user.

```json
["theapitimes", "danielloureno"]
```

### GET `{platform}/user-settings`

User settings as a flat key-value store.

```json
{
  "seenHomePageOnboarding": true,
  "hasSentFirstNote": true,
  "firstNoteDraftKey": "abc123",
  "seenNotesSelfServeOnboarding": true,
  "hasSeenNotesTabOnboarding": true,
  "notifications": "...",
  "settingsVersion": 3
}
```

---

## Feed & Content

### GET `{platform}/reader/feed/profile/{profileId}`

Feed items for a specific user **across all publications**. This is the main way to get everything a user has done — posts, notes, and comments on posts.

**Auth**: No auth required for reading. Returns all public content by that user.

**Query params**:
| Param | Description |
|-------|-------------|
| `cursor` | Cursor-based pagination (base64) |
| `types` | Filter by content type: `note`, `post`, `comment`, `all`, or comma-separated like `post,note` |

Examples:
- `?types=note` — notes/comments only (works at platform scope)
- `?types=post` — posts only
- `?types=all` — everything

```json
{
  "items": [
    {
      "type": "post",
      "id": null,
      "publication_id": null,
      "publication": { "id": 7073311, "name": "..." },
      "entity_key": "...",
      "post": {
        "id": 201869128,
        "title": "API Test — Updated Title",
        "publication_id": 7073311,
        "type": "newsletter",
        "audience": "everyone",
        "slug": "api-test",
        "post_date": "2025-12-17T22:29:10.614Z",
        ...
      },
      "comment": null,
      "context": { "type": "post", "timestamp": "...", "users": [...] }
    },
    {
      "type": "comment",
      "id": null,
      "publication_id": null,
      "publication": { "id": 7073311, "name": "..." },
      "entity_key": "...",
      "post": { ... parent post if reply ... },
      "comment": {
        "id": 279209572,
        "body": "Test note for comment exploration",
        "post_id": null,
        "publication_id": null,
        "user_id": 250852026,
        "type": "comment",
        "date": "2026-01-15T12:00:00.000Z",
        "ancestor_path": "",
        "reply_minimum_role": "everyone",
        "reaction_count": 0,
        "restacks": 0,
        "children_count": 0,
        "attachments": []
      },
      "context": { "type": "comment", "timestamp": "...", "users": [...] }
    }
  ],
  "originalCursorTimestamp": "2026-06-19T17:46:56.163Z",
  "nextCursor": "base64-encoded-cursor"
}
```

**Identifying content types**:

| Type | How to identify | Description |
|------|----------------|------------|
| Post | `item.type === "post"` + `item.post` is non-null | Newsletter post |
| Note (standalone) | `item.type === "comment"` + `item.comment.post_id === null` | Platform note, not tied to a specific post |
| Post reply | `item.type === "comment"` + `item.comment.post_id` is a number | Comment on a specific post |
| Threaded reply | `item.type === "comment"` + `item.comment.ancestor_path` non-empty | Reply to another comment |

**Getting the parent post**: If `item.comment.post_id` is non-null, fetch `GET /posts/by-id/{comment.post_id}` for the parent post's title and details. The `item.post` object at the item level may also contain the parent post's summary data.

**Cross-publication**: Since this endpoint is platform-scoped, items come from **all publications** the user participates in. Each item has a `publication` object with the owning publication's `id` and `name`.

### GET `{platform}/reader/feed?user_id={profileId}`

Same endpoint as above — the `user_id` param is accepted but **ignored**. Returns the same "For You" feed regardless of the value. Documented because the endpoint exists and responds 200, but the param has no observable effect.

### GET `{pub}/reader/feed/profile/{profileId}?types=note`

Notes for a specific user profile **within a single publication**. Publication scope, auth required. Cursor-paginated.

```json
{
  "items": [ ... same item structure as platform profile feed ... ],
  "nextCursor": "..."
}
```

This is scoped to one publication. For cross-publication results, use the platform-scoped endpoint without specifying a publication.

### GET `{platform}/profile/posts?profile_user_id={id}&limit={n}`

Published posts for a user across all their publications. Cursor-based pagination (`?cursor=`). **`offset` is rejected (400)** — use `cursor` instead. Accepts `limit` to control page size.

```json
{
  "posts": [
    {
      "id": 9876543,
      "title": "Hello World",
      "subtitle": "A test post",
      "slug": "hello-world",
      "publication_id": 12345,
      "publication": { "id": 12345, "name": "The API Times", "subdomain": "theapitimes" },
      "published_at": "2025-12-17T22:29:10.614Z",
      "updated_at": "2025-12-17T22:29:24.697Z",
      "type": "newsletter",
      "audience": "everyone",
      "draft_id": 5555555,
      "restacked": false,
      "restacks": 1,
      "reactions": { "❤": 0 },
      "comment_count": 0,
      "word_count": 15
    }
  ],
  "nextCursor": "base64-encoded-cursor-string"
}
```

### GET `{platform}/posts/by-id/{id}`

Single published post by ID. Returns full content with `body_html`.

Key fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | int | Post ID |
| `title` | string | Post title |
| `subtitle` | string | Post subtitle |
| `slug` | string | URL slug |
| `body_html` | string | Full rendered HTML |
| `body_json` | object | Tiptap JSON document (same format as drafts) |
| `draft_id` | int | Related draft |
| `publication_id` | int | Owning publication |
| `type` | string | Usually `"newsletter"` |
| `audience` | string | `"everyone"` or `"only_paid"` |
| `published_at` | ISO string | Publication timestamp |
| `reactions` | object | Like `{"❤": 0}` |
| `comment_count` | int | Number of comments |
| `restacked` | bool | Whether current user has restacked |
| `restacks` | int | Total restack count |

### GET `{platform}/reader/feed`

The **"For You" home feed** — the main algorithmic feed shown on `substack.com`. Returns a mix of posts, notes, and user suggestions ranked by ML model. Items are in `items` (not `comments`).

**Auth**: Optional but dramatically different results.
- **Without cookie**: Returns ~6 generic items (no personalization).
- **With cookie**: Returns ~7 items personalized to your session — follows, subscriptions, and algorithmic recommendations. The two feeds share **zero items** — the entire set changes.

**Pagination**: Cursor-based (`?cursor=`, response has `nextCursor`). Legacy `page`/`page_size` accepted but ignored.

**Query params**:
| Param | Effect |
|-------|--------|
| `cursor` | Cursor-based pagination |
| `user_id` | Accepted but **ignored** — has no effect on the response |

```json
{
  "items": [
    {
      "type": "comment",
      "entity_key": "c-280783015",
      "comment": {
        "id": 280783015,
        "body": "Não ",
        "body_json": { "type": "doc", ... },
        "user_id": 369865656,
        "handle": "sohtabb748748",
        "name": "SOHTAB",
        "post_id": null,
        "publication_id": null,
        "date": "2026-06-22T16:17:24.873Z",
        "reaction_count": 3,
        "reactions": { "❤": 3 },
        "ancestor_path": "",
        "children_count": 0,
        "attachments": []
      },
      "publication": null,
      "post": null,
      "context": {
        "type": "comment_like",
        "typeBucket": "notes",
        "source": "model",
        "model_score": 11.68,
        "page": 0,
        "page_rank": 0,
        "users": [ { "id": 496005976, "handle": "empirista", "name": "Estrela" } ]
      }
    },
    {
      "type": "post",
      "entity_key": "p-202738130",
      "post": {
        "id": 202738130,
        "title": "Por uma eugenia brasileira",
        "publication_id": 8836096,
        "type": "newsletter",
        "audience": "everyone"
      },
      "publication": { "id": 8836096, "name": "Arché Brasilis" },
      "comment": null,
      "context": {
        "type": "post",
        "typeBucket": "posts",
        "source": "model",
        "model_score": 3.24,
        "page": 0,
        "page_rank": 3
      }
    },
    {
      "type": "userSuggestions"
    }
  ],
  "nextCursor": "base64-encoded-cursor-string",
  "originalCursorTimestamp": "2026-06-19T19:04:04.459Z",
  "trackingParameters": {
    "feed_session_id": "uuid",
    "tab_id": "for-you",
    "top_note_impression_id": "uuid",
    "top_note_entity_key": "c-280635959",
    "top_note_model_score": 1.64,
    "top_note_source": "model",
    "is_following": false,
    "followed_user_count": 4,
    "subscribed_publication_count": 0
  }
}
```

**Item types**:

| `type` | Count | Description |
|--------|-------|-------------|
| `comment` | ~5 | Notes by various users. Standalone (`post_id` is always `null`). Can be text, link shares, or "liked by someone you may know" entries. |
| `post` | ~1 | Newsletter post from a publication |
| `userSuggestions` | ~1 | Recommendation block suggesting accounts/pubs to follow |

**Context metadata** (`item.context`):

| Field | Description |
|-------|-------------|
| `type` | Reason shown: `"note"`, `"post"`, `"comment_like"` (liked by someone you might follow) |
| `typeBucket` | `"notes"` or `"posts"` |
| `source` | `"model"` (ML algorithm), `"db-note"`, etc. |
| `model_score` | Ranking score (higher = more prominent) |
| `page`, `page_rank` | Position tracking for A/B testing |
| `users` | Relevant users (e.g., the liker on `comment_like` items) |

**Tracking parameters** (`trackingParameters`):

| Field | Description |
|-------|-------------|
| `feed_session_id` | Unique session identifier |
| `tab_id` | Always `"for-you"` — confirms this is the For You tab |
| `top_note_*` | Metadata about the highest-ranked item |
| `is_following` | Whether the authenticated user follows the top item's author |
| `followed_user_count` | How many users the authenticated user follows |
| `subscribed_publication_count` | How many pubs the user subscribes to |

### GET `{platform}/reader/comment/{id}`

Read a single note/comment by ID. No auth required.

```json
{
  "id": 4444444,
  "body_json": { "type": "doc", "attrs": { "schemaVersion": "v1" }, "content": [...] },
  "body_html": "<p>...</p>",
  "author": { "id": 1234567, "name": "Daniel Lourenco", "handle": "danielloureno" },
  "publication_id": 12345,
  "created_at": "2025-12-18T12:00:00.000Z",
  "likes": 0,
  "restacked": false,
  "restacks": 0,
  "attachments": [...],
  "post_id": null,
  "parent_id": null
}
```

### GET `{platform}/feed/following`

Returns a flat array of user IDs the authenticated user follows. Auth required. No pagination fields.

```json
[250852026, 92320804, 369471867, 310483991]
```

### GET `{pub}/notes`

Notes feed for a specific publication. Cursor-based pagination (`?cursor=`). Auth required.

```json
{
  "comments": [ ...same format as reader/feed... ],
  "nextCursor": null,
  "originalCursorTimestamp": "2026-06-19T19:04:07.038Z"
}
```

---

## Drafts

All draft endpoints are **publication-scoped**.

### GET `{pub}/drafts`

List all drafts and published posts. Supports both `offset`/`limit` and `cursor`/`limit` pagination. Returns `hasMore` (boolean) and `nextCursor` (numeric string — the next offset).

```json
{
  "posts": [
    {
      "id": 5555555,
      "title": "Hello World",
      "type": "newsletter",
      "status": "published",
      "published_at": "2025-12-17T22:29:10.614Z",
      "updated_at": "2025-12-17T22:29:24.697Z",
      "display_content": {
        "title": "Hello World",
        "subtitle": "A test post",
        "body_text": "This is the beginning of the post..."
      }
    }
  ],
  "nextCursor": "1",
  "hasMore": true
}
```

### GET `{pub}/drafts/{id}`

Single draft with full data.

```json
{
  "id": 5555555,
  "title": "Hello World",
  "subtitle": "A test post",
  "draft_body": {
    "type": "doc",
    "attrs": { "schemaVersion": "v1" },
    "content": [
      { "type": "heading", "attrs": { "level": 1 }, "content": [...] },
      { "type": "paragraph", "content": [...] },
      { "type": "image2", "attrs": { "src": "...", "alt": "...", "caption": "..." } }
    ]
  },
  "type": "newsletter",
  "status": "published",
  "audience": "everyone",
  "published_at": "2025-12-17T22:29:10.614Z",
  "updated_at": "2025-12-17T22:29:24.697Z"
}
```

### POST `{pub}/drafts`

Create a draft. Uses **Tiptap JSON** for `draft_body`.

Required body fields:

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Post title |
| `draft_body` | object | Tiptap JSON document |
| `type` | string | Always `"newsletter"` |
| `audience` | string | `"everyone"` or `"only_paid"` |

Response includes the `id` of the new draft.

### PUT `{pub}/drafts/{id}`

Update an existing draft. Same body shape as POST. Returns full draft object.

### DELETE `{pub}/drafts/{id}`

Delete a draft. Returns `{success: true}`.

### POST `{pub}/drafts/{id}/publish`

Publish a draft. Body:

```json
{
  "publishTime": null,
  "send": false,
  "share": false,
  "crossPostToSocial": false,
  "announce": false
}
```

If `publishTime` is `null`, publishes immediately. Set to a future ISO string for scheduled publishing.

Returns the full draft object with `status: "published"`.

---

## Notes

### POST `{platform}/comment/feed/`

Create a note. Uses **ProseMirror JSON** for `bodyJson`.

```json
{
  "bodyJson": {
    "type": "doc",
    "attrs": { "schemaVersion": "v1" },
    "content": [
      {
        "type": "paragraph",
        "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Hello" }]
      }
    ]
  },
  "tabId": "for-you",
  "surface": "feed",
  "replyMinimumRole": "everyone",
  "attachmentIds": ["uuid-of-attachment"]
}
```

**Note with image attachment only (no text body):**

```json
{
  "tabId": "for-you",
  "surface": "feed",
  "replyMinimumRole": "everyone",
  "attachmentIds": ["uuid-of-image-attachment"]
}
```

Fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bodyJson` | object | No* | ProseMirror JSON document. Optional when using `attachmentIds`. |
| `surface` | string | Yes | `"feed"` |
| `tabId` | string | Yes | `"for-you"` |
| `replyMinimumRole` | string | Yes | `"everyone"` |
| `attachmentIds` | string[] | No | Array of attachment UUIDs (from `/comment/attachment/`). **Single-use** — each UUID can only be used in one note. |
| `audience` | string | No | `"everyone"` (default) or `"only_paid"` |
| `publicationId` | int | No | Post to a specific publication's notes feed |

*\* `bodyJson` is technically optional — you can create a note with only image attachments and no body text. However, you must include at least `bodyJson`, `attachmentIds`, or both.*

**Important**: Attachment UUIDs are **single-use**. Once an attachment is used in a note, it cannot be reused in another note.

See [CONTENT_FORMATS.md](CONTENT_FORMATS.md) for the ProseMirror body schema.

### DELETE `{platform}/comment/{id}`

Delete a note. Returns `{success: true}`.

> ⚠ Platform scope only works for notes. To delete a **comment on a post**, use the publication scope endpoint.

---

## Comments on Posts

### POST `{pub}/post/{postId}/comment`

Create a comment on a post. Optional `ancestorPath` for replies.

```json
{
  "body": "Great post!",
  "ancestorPath": "/post/{postId}/comment/{parentCommentId}"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `body` | string | Plain text comment body |
| `ancestorPath` | string | Path to parent comment for replies (optional) |

### GET `{pub}/post/{postId}/comments`

Get all comments on a post. Returns flat array (no nesting).

```json
[
  {
    "id": 6666666,
    "body": "Great post!",
    "author": { "id": 1234567, "name": "Daniel Lourenco", "handle": "danielloureno" },
    "created_at": "2025-12-18T14:00:00.000Z",
    "ancestor_path": "",
    "replies_count": 0,
    "likes": 0,
    "is_published": true,
    "is_author": true
  }
]
```

### DELETE `{pub}/comment/{id}`

Delete a comment on a post. Returns `{success: true}`.

> ⚠ Must use publication scope. Using platform scope (`DELETE /api/v1/comment/{id}`) returns `500` for post comments.

---

## Reactions / Likes

### POST `{platform}/post/{postId}/reaction`

Like or unlike a post.

Body: `{ "reaction": "❤" }`

| Behaviour | Result |
|-----------|--------|
| First request | Adds a like. Increases reaction count. |
| Second request (same user, same post) | Removes the like. Toggles. |

Only `❤` is accepted. Other emoji (`🔥`, `👍`, `👎`) return `400` with a validation error.

### DELETE `{platform}/post/{id}/reaction`

Explicitly remove a reaction from a post (unlike). Toggling via `POST` already handles both like/unlike, but this provides an explicit removal path.

Body: `{}`

### POST `{platform}/comment/{id}/reaction`

Like or unlike a note/comment. Same body and toggle behaviour as post reactions.

### DELETE `{platform}/comment/{id}/reaction`

Explicitly remove a reaction from a note/comment.

Body: `{ "tabId": "for-you" }`

---

## Image Upload

### POST `{pub}/image`

Upload an image. This is the only endpoint that uses `application/x-www-form-urlencoded`.

```http
Content-Type: application/x-www-form-urlencoded

image=data:image/png;base64,iVBORw0KGgo...
```

| Field | Type | Description |
|-------|------|-------------|
| `image` | string | Data URI (Base64-encoded image) |

Response:

```json
{
  "url": "https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https://substack-post-media.s3.amazonaws.com/...",
  "success": true
}
```

---

## Publication Info

### GET `{pub}/publication`

Publication metadata.

```json
{
  "id": 12345,
  "name": "The API Times",
  "subdomain": "theapitimes",
  "custom_domain": null,
  "logo_url": "https://substackcdn.com/...",
  "author_id": 1234567,
  "theme": { "color_options": { "...": "..." } },
  "type": "newsletter"
}
```

### GET `{pub}/publication/sections`

Sections/categories for the publication.

```json
[
  {
    "id": 111,
    "name": "Tutorials",
    "slug": "tutorials",
    "publication_id": 12345
  }
]
```

### GET `{pub}/publication/settings`

Publication settings (may 403 for non-admin users).

---

## Cross-post / Restack

### POST `{platform}/restack/{postId}`

Cross-post a post from one publication to another. This is a **publication-level share** — it creates a link in the target publication, not a visible note.

```json
{
  "restackingPubId": 12345,
  "audience": "everyone",
  "introText": "I'm reprinting this post from another publication:"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `restackingPubId` | int | ID of the publication to cross-post INTO |
| `audience` | string | `"everyone"` or `"only_paid"` |
| `introText` | string | Optional intro text shown before the cross-posted content |

### RESTACK WORKFLOW (Note-based restack)

For a social/visible restack in the notes feed:

1. **Create attachment** — `POST /comment/attachment/`
   ```json
   { "url": "https://{pub}.substack.com/p/{slug}", "type": "link" }
   ```
   Response: `{ "id": "uuid", "type": "post" or "comment", "url": "..." }`
   
   The `type` in the response changes to `"post"` or `"comment"` based on URL content. Using `type: "link"` in the request body is correct — the server resolves it.

2. **Create note with attachment** — `POST /comment/feed/`
   ```json
   {
     "bodyJson": { "type": "doc", ... },
     "tabId": "for-you", "surface": "feed", "replyMinimumRole": "everyone",
     "attachmentIds": ["uuid-from-step-1"]
   }
   ```

3. **Clean up** — Delete the note as normal. Note: deleting a restack note does **not** decrement the source content's `restacks` counter.

You can attach **multiple** items: `attachmentIds: ["uuid1", "uuid2"]`. Notes cannot be restacked using the cross-post endpoint — only posts.

### IMAGE ATTACHMENT WORKFLOW

For attaching images to notes (renders as embedded image cards within the note):

1. **Upload image** — `POST {pub}/image`
   ```http
   Content-Type: application/x-www-form-urlencoded
   image=data:image/png;base64,iVBORw0KGgo...
   ```
   Response: `{ "url": "https://substackcdn.com/...", "success": true }`

2. **Create image attachment** — `POST /comment/attachment/`
   ```json
   { "url": "https://substack-post-media.s3.amazonaws.com/public/images/...", "type": "image" }
   ```
   Response:
   ```json
   {
     "id": "uuid",
     "type": "image",
     "imageUrl": "https://substack-post-media.s3.amazonaws.com/public/images/...",
     "imageWidth": 800,
     "imageHeight": 600,
     "explicit": false
   }
   ```
   > **Note**: `type: "image"` in the request body is essential. Using `type: "link"` with an image URL returns `200 null` (no attachment created).

3. **Create note with image attachment** — `POST /comment/feed/`
   ```json
   {
     "tabId": "for-you", "surface": "feed", "replyMinimumRole": "everyone",
     "attachmentIds": ["uuid-from-step-2"]
   }
   ```
   The `bodyJson` field is optional — you can create an image-only note.

4. **Attachments are single-use**. A given attachment UUID can only be used in one note. Attempting to reuse it returns `400`.

**Multiple images**: You can attach multiple images in a single note:
```json
{ "attachmentIds": ["uuid-img-1", "uuid-img-2"] }
```

**Mixing attachments**: Image attachments and post/note restack attachments can be mixed in the same note:
```json
{ "attachmentIds": ["uuid-image", "uuid-post-restack"] }
```

**Limitations**:
- Images cannot be rendered inline in the note's body text (no `image2` in ProseMirror). They appear as attachment cards below the text.
- The note `body_json` supports only text markdown (paragraphs, bold, italic, lists, links). See [CONTENT_FORMATS.md](CONTENT_FORMATS.md).

---

## Subscriber Data

### Available

| Source | Data | Endpoint |
|--------|------|----------|
| Public profile | Free subscriber count + rough bucket, follower count | `GET /user/{handle}/public_profile` |
| Publication info | Boolean flags: `has_paid_subs`, `payments_state`, `founding_plan_enabled` | `GET {pub}/publication` |

### Not Available (via public API)

- **Paid subscriber count** — no endpoint exposes this. The `has_paid_subs` boolean is the only indicator.
- **Subscriber analytics / stats** — no `dashboard/*`, `publication/stats`, `publication/analytics`, or `publication/subscribers` endpoint exists in any of the three cloned repos. All attempted patterns return Cloudflare blocks or "Not authorized".
- **Subscriber lists** — `GET /user/{id}/subscriber-lists?lists=following` exists but returns *who the user follows*, not subscriber analytics. Returns Cloudflare 403 when accessed programmatically.
- **Per-post subscriber stats** — individual posts in `GET /profile/posts` do not include subscriber counts or revenue data.

### Why

Substack's analytics dashboard (accessible at `substack.com/dashboard` in the browser) likely uses internal/admin-only endpoints not exposed through the public API used by these clients. The three cloned repos (TS library, Python gateway, Obsidian plugin) handle content creation/reading — not analytics.

---

## Pagination Patterns

### Cursor-based (most feed endpoints)

Uses opaque `?cursor=` query param (base64-encoded). Invalid cursor values return **400**. Response includes `nextCursor` (cursor for next page) and `originalCursorTimestamp`.

| Endpoint | Scope | Response pagination fields |
|----------|-------|---------------------------|
| `GET /reader/feed` | Platform | `nextCursor`, `originalCursorTimestamp`, `trackingParameters` |
| `GET /reader/feed/profile/{id}` | Platform | `nextCursor`, `originalCursorTimestamp` |
| `GET /profile/posts?profile_user_id={id}` | Platform | `nextCursor` |
| `GET {pub}/notes` | Publication | `nextCursor`, `originalCursorTimestamp` |
| `GET {pub}/reader/feed/profile/{id}?types=note` | Publication | `nextCursor`, `originalCursorTimestamp` |

### Offset-based (legacy, being deprecated)

Uses `?offset=` and `?limit=` params. Response includes `hasMore` (bool) and `nextCursor` (numeric string = next offset value).

| Endpoint | Scope | Notes |
|----------|-------|-------|
| `GET {pub}/drafts` | Publication | Also accepts `?cursor=` (alias for offset). Response: `nextCursor` (numeric), `hasMore`. |

### No pagination

| Endpoint | Scope | Reason |
|----------|-------|--------|
| `GET /feed/following` | Platform | Returns a flat array of user IDs (all followed users at once) |
| `GET /reader/comment/{id}` | Platform | Single resource |
| `GET /posts/by-id/{id}` | Platform | Single resource |
| `GET /user/{handle}/public_profile` | Platform | Single resource |
| `GET /user/profile/self` | Platform | Single resource |
| `GET /user-settings` | Platform | Single resource (flat key-value store) |
| `GET {pub}/publication` | Publication | Single resource |
| `GET {pub}/publication/sections` | Publication | Small fixed list |
| `GET {pub}/publication/settings` | Publication | Single resource |
| `GET {pub}/drafts/{id}` | Publication | Single resource |
| `GET {pub}/post/{id}/comments` | Publication | All comments returned at once (no pagination) |

### Migration history

- **`profile/posts`**: Previously accepted `offset`/`limit`, now **rejects `offset`** (400). Must use `cursor`/`limit`.
- **`reader/feed`**: Previously used `page`/`page_size`, now cursor-based. Legacy params still accepted but ignored.
- **`pub/drafts`**: Still accepts both `offset` and `cursor` — `cursor` is simply the numeric offset as a string.
