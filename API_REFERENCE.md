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

Public profile by handle. No auth required.

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
  ]
}
```

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

Feed items for a specific user profile. Returns posts, notes, and other content by that user. No auth required (platform scope).

Query params: `cursor` (for cursor-based pagination)

```json
{
  "items": [
    { "type": "post", ... },
    { "type": "comment", ... }
  ],
  "originalCursorTimestamp": "2026-06-19T17:46:56.163Z",
  "nextCursor": "..."
}
```

### GET `{pub}/reader/feed/profile/{profileId}?types=note`

Notes for a specific user profile within a publication. Publication scope, auth required. Cursor-paginated.

```json
{
  "items": [...],
  "nextCursor": "..."
}
```

### GET `{platform}/profile/posts?profile_user_id={id}&limit={n}`

Published posts for a user across all their publications. Paginated with `offset`.

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
  "next_offset": 10
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

Notes feed. Paginated with `page` and `page_size` (defaults). No auth required for reading.

```json
{
  "comments": [
    {
      "id": 4444444,
      "body_json": {
        "type": "doc",
        "attrs": { "schemaVersion": "v1" },
        "content": [
          { "type": "paragraph", "content": [{ "type": "text", "text": "Hello Substack" }] }
        ]
      },
      "body_html": "<p>Hello Substack</p>",
      "author": { "id": 1234567, "name": "Daniel Lourenco", "handle": "danielloureno" },
      "publication_id": 12345,
      "created_at": "2025-12-18T12:00:00.000Z",
      "likes": 2,
      "restacked": false,
      "attachments": []
    }
  ],
  "next_page": 2
}
```

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

Posts from publications the user follows. Auth required.

```json
{
  "feed": [
    {
      "type": "post",
      "post": {
        "id": 9876543,
        "title": "...",
        "slug": "...",
        "publication_id": 12345,
        "publication": { "id": 12345, "name": "...", "subdomain": "..." },
        "audience": "everyone",
        "published_at": "2025-12-18T10:00:00.000Z",
        "reactions": { "❤": 0 },
        "comment_count": 0
      }
    },
    { "type": "note", "comment": { ... } }
  ],
  "has_more_pages": false,
  "last_sorting_id": "..."
}
```

### GET `{pub}/notes`

Notes feed for a specific publication. Auth required.

```json
{
  "comments": [ ...same format as reader/feed... ]
}
```

---

## Drafts

All draft endpoints are **publication-scoped**.

### GET `{pub}/drafts`

List all drafts and published posts. Paginated. `offset` and `limit` query params.

```json
{
  "drafts": [
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
  "next_offset": 10
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
