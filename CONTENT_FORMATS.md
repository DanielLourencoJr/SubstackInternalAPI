# Content Formats

Substack uses two different JSON document formats depending on the content type:

- **Tiptap** — used for drafts/posts (`draft_body`, `body_json` in post responses)
- **ProseMirror** — used for notes (`bodyJson` in note creation/retrieval)

Both are valid ProseMirror document structures, but with different node/mark names.

---

## Tiptap (Drafts & Posts)

Used in:
- `POST /{pub}/drafts` (`draft_body`)
- `PUT /{pub}/drafts/{id}` (`draft_body`)
- `GET /{pub}/drafts/{id}` (`draft_body`)
- `GET /{platform}/posts/by-id/{id}` (`body_json`)

### Text Marks

| Tiptap Mark | Description |
|-------------|-------------|
| `strong` | Bold text |
| `em` | Italic text |
| `link` | Hyperlink with `href` and optional `title` attrs |
| `strike` | Strikethrough |
| `underline` | Underlined text |
| `code` | Inline code |

### Block Nodes

| Tiptap Node | Description |
|-------------|-------------|
| `paragraph` | Text paragraph |
| `heading` | Heading with `level` attr (1-6) |
| `bulletList` | Unordered list |
| `orderedList` | Ordered list |
| `listItem` | List item (child of bulletList/orderedList) |
| `image2` | Inline image with `src`, `alt`, `caption`, `title` attrs |
| `codeBlock` | Code block |
| `blockquote` | Blockquote |
| `horizontalRule` | Horizontal rule |
| `hardBreak` | Line break |

### Example

```json
{
  "type": "doc",
  "attrs": { "schemaVersion": "v1" },
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [{ "type": "text", "text": "Title" }]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "marks": [{ "type": "strong" }], "text": "Bold" },
        { "type": "text", "text": " and " },
        { "type": "text", "marks": [{ "type": "em" }], "text": "italic" }
      ]
    },
    {
      "type": "image2",
      "attrs": {
        "src": "https://substackcdn.com/...",
        "alt": "An image",
        "caption": "Image caption",
        "title": null
      }
    }
  ]
}
```

---

## ProseMirror (Notes)

Used in:
- `POST /{platform}/comment/feed/` (`bodyJson`)
- `GET /{platform}/reader/feed` (`body_json`)
- `GET /{platform}/reader/comment/{id}` (`body_json`)

### Text Marks

| ProseMirror Mark | Description |
|------------------|-------------|
| `bold` | Bold text |
| `italic` | Italic text |
| `link` | Hyperlink with `href` attr |
| `code` | Inline code |

### Block Nodes

| ProseMirror Node | Description |
|------------------|-------------|
| `paragraph` | Text paragraph |
| `bulletList` | Unordered list |
| `orderedList` | Ordered list |
| `listItem` | List item |

### Unsupported Nodes (verified 400 errors)

The following will cause `HTTP 400` if included in a note body:

- `image` / `image2` — inline images are not supported in notes
- `heading` — headings are not allowed
- `codeBlock` — code blocks are not allowed
- `blockquote` — blockquotes are not allowed
- `horizontalRule` — horizontal rules are not allowed
- `hardBreak` — hard breaks are not allowed

### Attaching Images to Notes

While inline images (`image2`) are not allowed in the note body JSON, **images can be attached to notes as attachment cards** using the `/comment/attachment/` endpoint with `type: "image"`:

```
POST /comment/attachment/
{ "url": "<uploaded-image-cdn-url>", "type": "image" }
→ { "id": "uuid", "type": "image", "imageUrl": "...", ... }

POST /comment/feed/
{ "tabId": "for-you", "surface": "feed", ..., "attachmentIds": ["uuid"] }
```

The image renders as a card below the note text. For the full workflow, see [API_REFERENCE.md](API_REFERENCE.md) (Image Attachment Workflow).

### Example

```json
{
  "type": "doc",
  "attrs": { "schemaVersion": "v1" },
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "marks": [{ "type": "bold" }], "text": "Bold" },
        { "type": "text", "text": " and " },
        { "type": "text", "marks": [{ "type": "italic" }], "text": "italic" }
      ]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "content": [
            { "type": "paragraph", "content": [{ "type": "text", "text": "Item 1" }] }
          ]
        },
        {
          "type": "listItem",
          "content": [
            { "type": "paragraph", "content": [{ "type": "text", "text": "Item 2" }] }
          ]
        }
      ]
    }
  ]
}
```

---

## Summary Table

| Feature | Tiptap (Drafts/Posts) | ProseMirror (Notes) |
|---------|----------------------|---------------------|
| Bold | `strong` | `bold` |
| Italic | `em` | `italic` |
| Link | ✅ `link` | ✅ `link` |
| Code | ✅ `code` | ✅ `code` |
| Strikethrough | ✅ `strike` | ❌ |
| Underline | ✅ `underline` | ❌ |
| Headings | ✅ `heading` (1-6) | ❌ |
| Inline images | ✅ `image2` | ❌ |
| Code blocks | ✅ `codeBlock` | ❌ |
| Blockquotes | ✅ `blockquote` | ❌ |
| Horizontal rules | ✅ `horizontalRule` | ❌ |
| Hard breaks | ✅ `hardBreak` | ❌ |
| Lists | ✅ `bulletList`/`orderedList` | ✅ `bulletList`/`orderedList` |
| Paragraphs | ✅ | ✅ |
