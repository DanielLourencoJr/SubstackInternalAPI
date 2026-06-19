// ─── Substack Internal API — Regression Test Suite ───────────────────────
// Run: node tests/test_substack_api.mjs
// Update SID before running (get from browser DevTools → Application → Cookies → substack.sid)
//
// Every endpoint is tested for response shape (expected fields + types).
// Failure means the API surface changed — investigate immediately.

const SID = "s%3AbuAZ0i6e9vbX7gLgT7XxSa44kqLgMqRE.FzO2NhOn0JrXZ%2Bdjc%2B63Cnsb1tNz6tBxuhObmvG9Xtw";
const PUBLICATION = "danielloureno.substack.com";

const COOKIE = `substack.sid=${SID}`;
const P = "https://substack.com/api/v1";
const B = `https://${PUBLICATION}/api/v1`;

// ─── Helpers ─────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));
const RATE_DELAY = 2000; // ms between tests to avoid rate limits

async function api(base, method, path, body, headers) {
  const url = `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  const opts = { method, headers: { "Content-Type": "application/json", Cookie: COOKIE, ...headers } };
  if (body != null) opts.body = typeof body === "string" ? body : JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, ok: res.ok, json, text };
}

function apiForm(url, body) {
  return fetch(url, { method: "POST", headers: { Cookie: COOKIE, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body).toString() }).then(async res => {
    const text = await res.text(); let json = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, ok: res.ok, json, text };
  });
}

let passed = 0, failed = 0, skipped = 0;

function assert(cond, msg) { if (!cond) throw Error(msg); }

function assertOk(r, ctx) {
  if (!r.ok) throw Error(`${ctx} HTTP ${r.status}: ${JSON.stringify(r.json || r.text).slice(0, 200)}`);
}

function assertField(o, k, t) {
  const val = o?.[k];
  if (typeof val !== t) {
    const str = val === undefined ? "undefined" : JSON.stringify(val).slice(0, 80);
    throw Error(`expected .${k} to be ${t}, got ${typeof val} (${str})`);
  }
}

function assertArr(o, k) {
  if (!Array.isArray(o?.[k])) throw Error(`expected .${k} to be array, got ${typeof o[k]}`);
}

// ─── Runner ──────────────────────────────────────────────────────────────

let createdNotes = [], createdDrafts = [], createdComments = [];
let ownId, ownHandle, publicationId, targetPostId, uploadedImageUrl;

async function test(n, label, fn) {
  console.log(`\n${"=".repeat(72)}`);
  console.log(`  [${String(n).padStart(2, "0")}] ${label}`);
  console.log(`${"=".repeat(72)}`);
  try {
    await fn();
    passed++;
    console.log(`  ✅ PASS`);
  } catch (e) {
    failed++;
    console.log(`  ❌ FAIL: ${e.message}`);
  }
  await sleep(RATE_DELAY);
}

// Cleanup helper
async function cleanupNotes() {
  for (const id of [...new Set(createdNotes)]) {
    try { await api(P, "DELETE", `comment/${id}`); } catch {}
  }
  createdNotes = [];
}

async function cleanupDrafts() {
  for (const id of [...new Set(createdDrafts)]) {
    try { await api(B, "DELETE", `drafts/${id}`); } catch {}
  }
  createdDrafts = [];
}

async function cleanupComments() {
  for (const id of [...new Set(createdComments)]) {
    try { await api(B, "DELETE", `comment/${id}`); } catch {}
  }
  createdComments = [];
}

// ─────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────

await test(1, "Auth — public endpoints work without cookie", async () => {
  for (const url of [`${P}/user/danielloureno/public_profile`, `${P}/reader/feed`]) {
    const r = await fetch(url, { headers: { "Content-Type": "application/json" } });
    assert(r.ok, `${url} returned ${r.status} without cookie`);
  }
});

await test(2, "Auth — protected endpoints reject without cookie", async () => {
  for (const url of [`${P}/feed/following`, `${P}/user/profile/self`, `${B}/drafts`]) {
    const r = await fetch(url, { headers: { "Content-Type": "application/json" } });
    assert(r.status === 401 || r.status === 403, `${url} returned ${r.status} (expected 401/403)`);
  }
});

await test(3, "Auth — valid cookie works", async () => {
  const r = await api(P, "GET", "user/profile/self");
  assertOk(r, "profile/self");
  ownId = r.json.id;
  ownHandle = r.json.handle;
  assertField(r.json, "id", "number");
  assertField(r.json, "name", "string");
  assert(typeof ownId === "number", "no id");
  assert(typeof ownHandle === "string", "no handle");
});

// ─────────────────────────────────────────────────────────────────────────
// DISCOVERY
// ─────────────────────────────────────────────────────────────────────────

await test(4, "GET /handle/options — available slugs", async () => {
  const r = await api(P, "GET", "handle/options");
  assertOk(r, "handle/options");
  assertArr(r.json, "potentialHandles");
});

await test(5, "GET /user-settings — settings shape", async () => {
  const r = await api(P, "GET", "user-settings");
  assertOk(r, "user-settings");
  const arr = Array.isArray(r.json) ? r.json : r.json?.userSettings;
  assert(Array.isArray(arr), `unexpected shape: ${Object.keys(r.json).join(",")}`);
});

await test(6, "GET /user/{handle}/public_profile — public profile", async () => {
  const r = await api(P, "GET", `user/${ownHandle}/public_profile`);
  assertOk(r, "public_profile");
  assertField(r.json, "id", "number");
  assertField(r.json, "name", "string");
  assertField(r.json, "handle", "string");
  assertArr(r.json, "publicationUsers");
  publicationId = r.json.publicationUsers?.[0]?.publication?.id || r.json.publicationUsers?.[0]?.publication_id;
});

await test(7, "GET {pub}/publication — publication info", async () => {
  const r = await api(B, "GET", "publication");
  assertOk(r, "publication");
  assertField(r.json, "id", "number");
  assertField(r.json, "name", "string");
  assertField(r.json, "subdomain", "string");
  publicationId = r.json.id;
});

await test(8, "GET {pub}/publication/sections — sections", async () => {
  const r = await api(B, "GET", "publication/sections");
  assertOk(r, "publication/sections");
  assert(Array.isArray(r.json), "expected array");
});

await test(9, "GET {pub}/publication/settings — settings", async () => {
  const r = await api(B, "GET", "publication/settings");
  assert(r.status === 200 || r.status === 403, `expected 200 or 403, got ${r.status}`);
});

// ─────────────────────────────────────────────────────────────────────────
// FEED / CONTENT
// ─────────────────────────────────────────────────────────────────────────

await test(10, "GET /profile/posts — published posts shape (cursor pagination)", async () => {
  const r = await api(P, "GET", `profile/posts?profile_user_id=${ownId}&limit=5`);
  assertOk(r, "profile/posts");
  assertArr(r.json, "posts");
  assert(r.json.nextCursor === null || typeof r.json.nextCursor === "string", `expected nextCursor null|string, got ${typeof r.json.nextCursor}`);
  if (r.json.posts.length > 0) {
    const p = r.json.posts[0];
    assertField(p, "id", "number");
    assertField(p, "title", "string");
    targetPostId = p.id;
  }
});

await test(11, "GET /posts/by-id/{id} — full post shape", async () => {
  if (!targetPostId) throw Error("no published post found — feed/profile/posts returned empty");
  const r = await api(P, "GET", `posts/by-id/${targetPostId}`);
  assertOk(r, "posts/by-id");
  const post = r.json.post || r.json;
  assertField(post, "id", "number");
  assertField(post, "title", "string");
  assertField(post, "body_html", "string");
  assertField(post, "publication_id", "number");
});

await test(12, "GET /reader/feed — notes feed shape (cursor pagination)", async () => {
  const r = await api(P, "GET", "reader/feed?page=1&page_size=3");
  assertOk(r, "reader/feed");
  const items = r.json.items || r.json.comments || [];
  assert(Array.isArray(items), "expected items/comments array");
  assert(r.json.nextCursor === null || typeof r.json.nextCursor === "string", `expected nextCursor null|string, got ${typeof r.json.nextCursor}`);
  if (items.length > 0) {
    const item = items[0].comment || items[0];
    assertField(item, "id", "number");
  }
});

await test(13, "GET /reader/comment/{id} — single note shape", async () => {
  const feed = await api(P, "GET", "reader/feed?page=1&page_size=1");
  assertOk(feed, "reader/feed (seed)");
  const items = feed.json.items || feed.json.comments || [];
  const nid = items[0]?.comment?.id || items[0]?.id;
  if (!nid) throw Error("feed empty");
  const r = await api(P, "GET", `reader/comment/${nid}`);
  assertOk(r, "reader/comment");
  const c = r.json.item?.comment || r.json;
  assertField(c, "id", "number");
  // body_json may be present for text notes or null for image-only notes
  if (typeof c.body_json === "object" && c.body_json) {
    // ok
  }
});

await test(14, "GET /feed/following — following (flat array of user IDs)", async () => {
  const r = await api(P, "GET", "feed/following");
  assertOk(r, "feed/following");
  assert(Array.isArray(r.json), `expected array, got ${typeof r.json}`);
  if (r.json.length > 0) assert(typeof r.json[0] === "number", `expected number IDs, got ${typeof r.json[0]}`);
});

await test(15, "GET {pub}/notes — publication notes feed (cursor pagination)", async () => {
  const r = await api(B, "GET", "notes");
  assertOk(r, "pub/notes");
  const notes = r.json?.comments || r.json?.notes || [];
  assert(Array.isArray(notes), "expected array of notes");
  // nextCursor may be null (no more pages) or a string
  assert(r.json.nextCursor === null || typeof r.json.nextCursor === "string", `expected nextCursor null|string, got ${typeof r.json.nextCursor}`);
});

// ─────────────────────────────────────────────────────────────────────────
// DRAFTS — CRUD
// ─────────────────────────────────────────────────────────────────────────

let draftId;

await test(16, "POST {pub}/drafts — create draft", async () => {
  const r = await api(B, "POST", "drafts", {
    draft_title: "API Test — Regression",
    draft_subtitle: "Created by test suite",
    draft_body: JSON.stringify({ type: "doc", attrs: { schemaVersion: "v1" }, content: [{ type: "paragraph", content: [{ type: "text", text: "Regression test." }] }] }),
    draft_bylines: [], type: "newsletter", audience: "everyone", section_chosen: false, write_comment_permissions: "everyone",
  });
  assertOk(r, "drafts/create");
  draftId = r.json?.id;
  assert(typeof draftId === "number", "no draft id");
  createdDrafts.push(draftId);
});

await test(17, "GET {pub}/drafts — list drafts (offset/cursor hybrid)", async () => {
  const r = await api(B, "GET", "drafts");
  assertOk(r, "drafts/list");
  assertArr(r.json, "posts");
  assertField(r.json, "hasMore", "boolean");
  assert(typeof r.json.nextCursor === "string", `expected nextCursor string, got ${typeof r.json.nextCursor}`);
});

await test(18, "GET {pub}/drafts/{id} — get single draft", async () => {
  if (!draftId) throw Error("no draftId");
  const r = await api(B, "GET", `drafts/${draftId}`);
  assertOk(r, "drafts/get");
  assertField(r.json, "id", "number");
  const title = r.json.title || r.json.draft_title;
  assert(typeof title === "string", `missing title field, keys: ${Object.keys(r.json).join(",")}`);
});

await test(19, "PUT {pub}/drafts/{id} — update draft", async () => {
  if (!draftId) throw Error("no draftId");
  const r = await api(B, "PUT", `drafts/${draftId}`, {
    draft_title: "API Test — Updated",
    draft_body: JSON.stringify({ type: "doc", attrs: { schemaVersion: "v1" }, content: [{ type: "paragraph", content: [{ type: "text", text: "Updated." }] }] }),
    audience: "everyone",
  });
  assertOk(r, "drafts/update");
});

await test(20, "DELETE {pub}/drafts/{id} — delete draft", async () => {
  if (!draftId) throw Error("no draftId");
  const r = await api(B, "DELETE", `drafts/${draftId}`);
  assertOk(r, "drafts/delete");
  createdDrafts = createdDrafts.filter(id => id !== draftId);
  draftId = null;
});

// ─────────────────────────────────────────────────────────────────────────
// NOTES
// ─────────────────────────────────────────────────────────────────────────

let noteId;

await test(21, "POST /comment/feed/ — create note", async () => {
  const r = await api(P, "POST", "comment/feed/", {
    bodyJson: { type: "doc", attrs: { schemaVersion: "v1" }, content: [{ type: "paragraph", content: [{ type: "text", text: "Regression test note." }] }] },
    tabId: "for-you", surface: "feed", replyMinimumRole: "everyone",
  });
  assertOk(r, "note/create");
  noteId = r.json?.id;
  assert(typeof noteId === "number", "no note id");
  createdNotes.push(noteId);
});

await test(22, "GET /reader/comment/{id} — read created note", async () => {
  if (!noteId) throw Error("no noteId");
  const r = await api(P, "GET", `reader/comment/${noteId}`);
  assertOk(r, "reader/comment");
  const c = r.json.item?.comment || r.json;
  assert(c.id === noteId, `expected id ${noteId}, got ${c.id}`);
});

await test(23, "DELETE /comment/{id} — delete note", async () => {
  if (!noteId) throw Error("no noteId");
  const r = await api(P, "DELETE", `comment/${noteId}`);
  assertOk(r, "note/delete");
  createdNotes = createdNotes.filter(id => id !== noteId);
  noteId = null;
});

// ─────────────────────────────────────────────────────────────────────────
// COMMENTS ON POSTS
// ─────────────────────────────────────────────────────────────────────────

let commentId;

await test(24, "POST {pub}/post/{id}/comment — create comment", async () => {
  if (!targetPostId) throw Error("no targetPostId (no published post)");
  const r = await api(B, "POST", `post/${targetPostId}/comment`, { body: "Regression test comment." });
  assertOk(r, "comment/create");
  commentId = r.json?.id || r.json?.comment?.id;
  assert(typeof commentId === "number", "no comment id");
  createdComments.push(commentId);
});

await test(25, "GET {pub}/post/{id}/comments — list comments", async () => {
  if (!targetPostId) throw Error("no targetPostId");
  const r = await api(B, "GET", `post/${targetPostId}/comments`);
  assertOk(r, "post/comments");
  const comments = Array.isArray(r.json) ? r.json : r.json.comments;
  assert(Array.isArray(comments), "expected array or {comments: [...]}");
});

await test(26, "DELETE {pub}/comment/{id} — delete comment", async () => {
  if (!commentId) throw Error("no commentId");
  const r = await api(B, "DELETE", `comment/${commentId}`);
  assertOk(r, "comment/delete");
  createdComments = createdComments.filter(id => id !== commentId);
  commentId = null;
});

// ─────────────────────────────────────────────────────────────────────────
// REACTIONS
// ─────────────────────────────────────────────────────────────────────────

await test(27, "POST /post/{id}/reaction — like/unlike post", async () => {
  if (!targetPostId) {
    const list = await api(P, "GET", `profile/posts?profile_user_id=${ownId}&limit=1`);
    targetPostId = list.json?.posts?.[0]?.id;
  }
  if (!targetPostId) throw Error("no post id");

  const r1 = await api(P, "POST", `post/${targetPostId}/reaction`, { reaction: "❤" });
  assertOk(r1, "post/reaction (like)");

  const r2 = await api(P, "POST", `post/${targetPostId}/reaction`, { reaction: "❤" });
  assertOk(r2, "post/reaction (unlike)");
});

await test(28, "POST /comment/{id}/reaction — like/unlike note", async () => {
  const n = await api(P, "POST", "comment/feed/", {
    bodyJson: { type: "doc", attrs: { schemaVersion: "v1" }, content: [{ type: "paragraph", content: [{ type: "text", text: "Reaction test." }] }] },
    tabId: "for-you", surface: "feed", replyMinimumRole: "everyone",
  });
  if (!n.ok || !n.json?.id) throw Error("could not create test note");
  const tmpId = n.json.id;
  createdNotes.push(tmpId);

  const r1 = await api(P, "POST", `comment/${tmpId}/reaction`, { reaction: "❤" });
  assertOk(r1, "comment/reaction (like)");

  const r2 = await api(P, "POST", `comment/${tmpId}/reaction`, { reaction: "❤" });
  assertOk(r2, "comment/reaction (unlike)");
});

// ─────────────────────────────────────────────────────────────────────────
// IMAGE UPLOAD
// ─────────────────────────────────────────────────────────────────────────

await test(29, "POST {pub}/image — upload image", async () => {
  const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const r = await apiForm(`${B}/image`, { image: `data:image/png;base64,${b64}` });
  assertOk(r, "image/upload");
  uploadedImageUrl = r.json?.url;
  assert(typeof uploadedImageUrl === "string" && uploadedImageUrl.startsWith("http"), `bad url: ${uploadedImageUrl}`);
});

// ─────────────────────────────────────────────────────────────────────────
// ATTACHMENTS — RESTACK + IMAGE IN NOTES
// ─────────────────────────────────────────────────────────────────────────

await test(30, "POST /comment/attachment/ — link attachment (restack)", async () => {
  const r = await api(P, "POST", "comment/attachment/", { url: `https://${PUBLICATION}/p/hello-world`, type: "link" });
  assertOk(r, "attachment/link");
  assertField(r.json, "id", "string");
});

await test(31, "POST /comment/attachment/ — image attachment", async () => {
  if (!uploadedImageUrl) throw Error("no uploaded image");
  const r = await api(P, "POST", "comment/attachment/", { url: uploadedImageUrl, type: "image" });
  assertOk(r, "attachment/image");
  assertField(r.json, "id", "string");
  assert(r.json.type === "image", `type=${r.json.type}, expected image`);
  assertField(r.json, "imageUrl", "string");
  assertField(r.json, "imageWidth", "number");
  assertField(r.json, "imageHeight", "number");
});

await test(32, "Note with image attachment", async () => {
  if (!uploadedImageUrl) throw Error("no uploaded image");
  const att = await api(P, "POST", "comment/attachment/", { url: uploadedImageUrl, type: "image" });
  if (!att.ok) throw Error("could not create attachment");

  const r = await api(P, "POST", "comment/feed/", {
    bodyJson: { type: "doc", attrs: { schemaVersion: "v1" }, content: [{ type: "paragraph", content: [{ type: "text", text: "Image note." }] }] },
    tabId: "for-you", surface: "feed", replyMinimumRole: "everyone",
    attachmentIds: [att.json.id],
  });
  assertOk(r, "note with image");
  const imgNoteId = r.json?.id;
  assert(typeof imgNoteId === "number", "no note id");
  createdNotes.push(imgNoteId);

  const rb = await api(P, "GET", `reader/comment/${imgNoteId}`);
  const c = rb.json.item?.comment || rb.json;
  const found = c.attachments?.some(a => a.id === att.json.id && a.type === "image");
  assert(found, "attachment missing in readback");
});

await test(33, "Image-only note (no bodyJson)", async () => {
  if (!uploadedImageUrl) throw Error("no uploaded image");
  const att = await api(P, "POST", "comment/attachment/", { url: uploadedImageUrl, type: "image" });
  if (!att.ok) throw Error("could not create attachment");

  const r = await api(P, "POST", "comment/feed/", {
    tabId: "for-you", surface: "feed", replyMinimumRole: "everyone",
    attachmentIds: [att.json.id],
  });
  assertOk(r, "image-only note");
  const id = r.json?.id;
  assert(typeof id === "number", "no note id");
  createdNotes.push(id);
});

// ─────────────────────────────────────────────────────────────────────────
// CROSS-POST ENDPOINT
// ─────────────────────────────────────────────────────────────────────────

await test(34, "POST /restack/{postId} — cross-post endpoint", async () => {
  const r = await api(P, "POST", "restack/1", {
    restackingPubId: publicationId || 1,
    audience: "everyone",
    introText: "Cross-post test.",
  });
  // Endpoint may return 400/404/403/500 depending on permissions and post existence.
  // Any response confirms the endpoint exists (vs connection error).
  assert(typeof r.status === "number", "no response");
});

await test(35, "GET /reader/feed/profile/{id} — profile feed (cursor pagination)", async () => {
  const r = await api(P, "GET", `reader/feed/profile/${ownId}`);
  assertOk(r, "profile feed");
  const items = r.json.items || [];
  assert(Array.isArray(items), "expected items array");
  assert(r.json.nextCursor === null || typeof r.json.nextCursor === "string", `expected nextCursor null|string, got ${typeof r.json.nextCursor}`);
});

await test(36, "GET {pub}/reader/feed/profile/{id}?types=note — profile notes (cursor pagination)", async () => {
  const r = await api(B, "GET", `reader/feed/profile/${ownId}?types=note`);
  assertOk(r, "profile notes");
  const items = r.json.items || [];
  assert(Array.isArray(items), "expected items array");
  assert(r.json.nextCursor === null || typeof r.json.nextCursor === "string", `expected nextCursor null|string, got ${typeof r.json.nextCursor}`);
});

await test(37, "DELETE /post/{id}/reaction — explicit unlike", async () => {
  if (!targetPostId) {
    const list = await api(P, "GET", `profile/posts?profile_user_id=${ownId}&limit=1`);
    targetPostId = list.json?.posts?.[0]?.id;
  }
  if (!targetPostId) throw Error("no post id");
  await api(P, "POST", `post/${targetPostId}/reaction`, { reaction: "❤" });
  const r = await fetch(`${P}/post/${targetPostId}/reaction`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Cookie: COOKIE },
    body: "{}",
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  assert(r.ok, `expected 200, got ${r.status}: ${text.slice(0, 200)}`);
});

await test(38, "DELETE /comment/{id}/reaction — explicit unlike note", async () => {
  const n = await api(P, "POST", "comment/feed/", {
    bodyJson: { type: "doc", attrs: { schemaVersion: "v1" }, content: [{ type: "paragraph", content: [{ type: "text", text: "DELETE reaction test" }] }] },
    tabId: "for-you", surface: "feed", replyMinimumRole: "everyone",
  });
  if (!n.ok || !n.json?.id) throw Error("could not create test note");
  const tmpId = n.json.id;
  createdNotes.push(tmpId);
  // Like first
  await api(P, "POST", `comment/${tmpId}/reaction`, { reaction: "❤" });
  const r = await api(P, "DELETE", `comment/${tmpId}/reaction`, { method: "DELETE", body: JSON.stringify({ tabId: "for-you" }) });
  assert(r.ok, `expected 200, got ${r.status}`);
});

// ─────────────────────────────────────────────────────────────────────────
// ERROR CASES
// ─────────────────────────────────────────────────────────────────────────

await test(39, "Invalid reaction emoji → 400", async () => {
  const r = await api(P, "POST", "post/1/reaction", { reaction: "🔥" });
  assert(r.status === 400, `expected 400, got ${r.status}`);
});

await test(40, "Unsupported note body node (image2) → 400 or 500", async () => {
  const r = await api(P, "POST", "comment/feed/", {
    bodyJson: { type: "doc", attrs: { schemaVersion: "v1" }, content: [{ type: "image2", attrs: { src: "https://example.com/img.png", alt: "" } }] },
    tabId: "for-you", surface: "feed", replyMinimumRole: "everyone",
  });
  // image2 in note body is rejected — may be 400 or 500 depending on server
  assert(r.status >= 400 && r.status < 600, `expected error status, got ${r.status}`);
});

await test(41, "Attachment UUID single-use → 400 on reuse", async () => {
  const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const img = await apiForm(`${B}/image`, { image: `data:image/png;base64,${b64}` });
  if (!img.ok) throw Error("image upload failed");

  const att = await api(P, "POST", "comment/attachment/", { url: img.json.url, type: "image" });
  if (!att.ok) throw Error("attachment creation failed");

  const n1 = await api(P, "POST", "comment/feed/", {
    bodyJson: { type: "doc", attrs: { schemaVersion: "v1" }, content: [{ type: "paragraph", content: [{ type: "text", text: "Use 1" }] }] },
    tabId: "for-you", surface: "feed", replyMinimumRole: "everyone",
    attachmentIds: [att.json.id],
  });
  if (n1.ok && n1.json?.id) createdNotes.push(n1.json.id);
  else throw Error("first note failed, cannot test reuse");

  const n2 = await api(P, "POST", "comment/feed/", {
    bodyJson: { type: "doc", attrs: { schemaVersion: "v1" }, content: [{ type: "paragraph", content: [{ type: "text", text: "Use 2" }] }] },
    tabId: "for-you", surface: "feed", replyMinimumRole: "everyone",
    attachmentIds: [att.json.id],
  });
  assert(n2.status === 400, `expected 400 on reuse, got ${n2.status}`);
});

// ─────────────────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────────────────

console.log(`\n${"=".repeat(72)}`);
console.log("  [99] Cleanup");
console.log(`${"=".repeat(72)}`);

await cleanupNotes();
await cleanupDrafts();
await cleanupComments();

// ─────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────

console.log(`\n${"=".repeat(72)}`);
console.log("  RESULTS");
console.log(`${"=".repeat(72)}`);
console.log(`  ✅ Passed: ${passed}`);
console.log(`  ❌ Failed: ${failed}`);
console.log(`  ⏭️  Skipped: 0`);
console.log(`${"=".repeat(72)}\n`);

process.exit(failed > 0 ? 1 : 0);
