import { writeFileSync } from "fs";

const SID = "s%3AvJmAQ4jVC4UBxomauFMJMBhzI5G80zNh.2Du1LtBKC8DHPVxAMrxTR9CpjxJ5wWspBWwv6RCV8ME";
const PUBLICATION = "danielloureno.substack.com";

const COOKIE = `substack.sid=${SID}`;
const SUBSTACK_BASE = "https://substack.com/api/v1";
const PUB_BASE = `https://${PUBLICATION}/api/v1`;

const headers = {
  "Content-Type": "application/json",
  Cookie: COOKIE,
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

async function api(base, method, path, body = null) {
  const url = `${base}/${path.replace(/^\//, "")}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, ok: res.ok, json, text: text.slice(0, 500) };
}

function banner(n, label) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`  TEST ${n}${label ? ` — ${label}` : ""}`);
  console.log(`${"=".repeat(70)}`);
}

function pass(msg) {
  console.log(`  ✅ ${msg}`);
}

function fail(msg, detail) {
  console.log(`  ❌ ${msg}`);
  if (detail) console.log(`     ${typeof detail === "string" ? detail : JSON.stringify(detail, null, 2).slice(0, 300)}`);
}

// ─────────────────────────────────────────────────────────────
// TEST 1: Connectivity — GET feed/following
// ─────────────────────────────────────────────────────────────
banner(1, "Connectivity check");
{
  const r = await api(SUBSTACK_BASE, "GET", "feed/following");
  if (r.ok) pass(`feed/following → ${r.status}`);
  else fail(`feed/following → ${r.status}`, r.text);
}

// ─────────────────────────────────────────────────────────────
// TEST 2: Resolve own handle — GET handle/options
// ─────────────────────────────────────────────────────────────
banner(2, "Resolve own slug");
let ownSlug = null;
{
  const r = await api(SUBSTACK_BASE, "GET", "handle/options");
  const handles = r.json?.potentialHandles || r.json?.potential_handles;
  if (r.ok && handles?.length) {
    ownSlug = handles[0].handle;
    pass(`handle/options → slug = @${ownSlug}`);
  } else {
    fail("handle/options", r.json || r.text);
  }
}

// ─────────────────────────────────────────────────────────────
// TEST 3: Get own profile with publication info
// ─────────────────────────────────────────────────────────────
banner(3, "Own profile / user profile");
let ownId = null;
{
  const r = await api(SUBSTACK_BASE, "GET", "user/profile/self");
  if (r.ok && r.json) {
    ownId = r.json.id;
    pass(`user/profile/self → id=${ownId}, name=${r.json.name || "?"}`);
    const pubs = r.json.publicationUsers || [];
    if (pubs.length) {
      pass(`  Found ${pubs.length} publication(s): ${pubs.map(p => p.publication?.subdomain).join(", ")}`);
    }
  } else {
    fail("user/profile/self", r.json || r.text);
  }
}

// ─────────────────────────────────────────────────────────────
// TEST 4: Get own user ID via user-settings
// ─────────────────────────────────────────────────────────────
banner(4, "User settings (ID resolution)");
{
  const r = await api(SUBSTACK_BASE, "GET", "user-settings");
  const settings = r.json?.userSettings || r.json?.user_settings;
  if (r.ok && settings?.length) {
    const uid = settings[0].user_id;
    pass(`user-settings → user_id=${uid}`);
  } else {
    fail("user-settings", r.json || r.text);
  }
}

// ─────────────────────────────────────────────────────────────
// TEST 5: Get a public profile by slug
// ─────────────────────────────────────────────────────────────
banner(5, "Public profile lookup");
{
  // Use our own slug if resolved, or a known one
  const slug = ownSlug || "jakubslys";
  const r = await api(SUBSTACK_BASE, "GET", `user/${slug}/public_profile`);
  if (r.ok && r.json) {
    pass(`user/${slug}/public_profile → id=${r.json.id}, name=${r.json.name}, followers=?`);
  } else {
    fail(`user/${slug}/public_profile`, r.json || r.text);
  }
}

// ─────────────────────────────────────────────────────────────
// TEST 6: Get posts for own profile
// ─────────────────────────────────────────────────────────────
banner(6, "Profile posts");
if (ownId) {
  const r = await api(SUBSTACK_BASE, "GET", `profile/posts?profile_user_id=${ownId}&limit=3`);
  if (r.ok && r.json) {
    const posts = r.json.posts || [];
    pass(`profile/posts → ${posts.length} post(s)`);
    for (const p of posts.slice(0, 2)) {
      console.log(`     📄 "${p.title}" (${p.post_date})`);
    }
  } else {
    fail("profile/posts", r.json || r.text);
  }
} else {
  fail("Skipped — no ownId resolved");
}

// ─────────────────────────────────────────────────────────────
// TEST 7: Get sections for publication
// ─────────────────────────────────────────────────────────────
banner(7, "Publication sections");
{
  const r = await api(PUB_BASE, "GET", "publication/sections");
  if (r.ok) {
    const sections = Array.isArray(r.json) ? r.json : r.json?.sections || [];
    pass(`publication/sections → ${sections.length} section(s)`);
    for (const s of sections) {
      console.log(`     📁 "${s.name}" (id=${s.id}, live=${s.is_live})`);
    }
  } else {
    fail("publication/sections", r.json || r.text);
  }
}

// ─────────────────────────────────────────────────────────────
// TEST 8: Create a draft post
// ─────────────────────────────────────────────────────────────
banner(8, "Create draft");
let draftId = null;
{
  const body = {
    draft_title: "API Test — Hello from the script",
    draft_subtitle: "Testing the internal Substack API",
    draft_body: JSON.stringify({
      type: "doc",
      attrs: { schemaVersion: "v1" },
      content: [{
        type: "paragraph",
        content: [
          { type: "text", text: "This post was created by a test script hitting " },
          { type: "text", text: "/api/v1/drafts", marks: [{ type: "code" }] },
          { type: "text", text: " directly. " },
          { type: "text", text: "It works!", marks: [{ type: "strong" }] },
        ],
      }],
    }),
    draft_bylines: [],
    audience: "everyone",
    type: "newsletter",
    section_chosen: false,
    write_comment_permissions: "everyone",
  };

  const r = await api(PUB_BASE, "POST", "drafts", body);
  if (r.ok && r.json?.id) {
    draftId = r.json.id;
    pass(`drafts → created id=${draftId}`);
  } else {
    fail("drafts (create)", r.json || r.text);
  }
}

// ─────────────────────────────────────────────────────────────
// TEST 9: Get the draft back
// ─────────────────────────────────────────────────────────────
banner(9, "Get draft by ID");
if (draftId) {
  const r = await api(PUB_BASE, "GET", `drafts/${draftId}`);
  if (r.ok) {
    pass(`drafts/${draftId} → title="${r.json?.draft_title}"`);
  } else {
    fail(`drafts/${draftId}`, r.json || r.text);
  }
} else {
  fail("Skipped — no draftId");
}

// ─────────────────────────────────────────────────────────────
// TEST 10: List drafts (returns wrapped object, not plain array)
// ─────────────────────────────────────────────────────────────
banner(10, "List all content");
{
  const r = await api(PUB_BASE, "GET", "drafts");
  if (r.ok) {
    const data = r.json;
    const posts = data?.posts || [];
    const drafts = posts.filter(p => !p.is_published);
    const published = posts.filter(p => p.is_published);
    pass(`drafts → ${drafts.length} draft(s), ${published.length} published`);
    for (const d of drafts) {
      console.log(`     📝 "${d.draft_title}" (id=${d.id})`);
    }
    for (const p of published) {
      console.log(`     📄 "${p.title}" (${p.slug})`);
    }
  } else {
    fail("drafts (list)", r.json || r.text);
  }
}

// ─────────────────────────────────────────────────────────────
// TEST 11: Update the draft
// ─────────────────────────────────────────────────────────────
banner(11, "Update draft");
if (draftId) {
  const r = await api(PUB_BASE, "PUT", `drafts/${draftId}`, {
    draft_title: "API Test — Updated Title",
    draft_subtitle: "Updated subtitle via PUT",
    draft_body: JSON.stringify({
      type: "doc",
      attrs: { schemaVersion: "v1" },
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: "Updated content via PUT /drafts/{id}" }],
      }],
    }),
    audience: "everyone",
  });
  if (r.ok) {
    pass(`PUT drafts/${draftId} → updated`);
  } else {
    fail(`PUT drafts/${draftId}`, r.json || r.text);
  }
} else {
  fail("Skipped — no draftId");
}

// ─────────────────────────────────────────────────────────────
// TEST 12: Create a note (short-form)
// ─────────────────────────────────────────────────────────────
banner(12, "Create note");
{
  const body = {
    bodyJson: {
      type: "doc",
      attrs: { schemaVersion: "v1" },
      content: [{
        type: "paragraph",
        content: [
          { type: "text", text: "Hello from the API test script! " },
          { type: "text", text: "This is a note", marks: [{ type: "bold" }] },
          { type: "text", text: " created via " },
          { type: "text", text: "POST /comment/feed/", marks: [{ type: "code" }] },
        ],
      }],
    },
    tabId: "for-you",
    surface: "feed",
    replyMinimumRole: "everyone",
  };

  const r = await api(SUBSTACK_BASE, "POST", "comment/feed/", body);
  if (r.ok && r.json?.id) {
    pass(`comment/feed/ → note id=${r.json.id}`);
  } else {
    fail("comment/feed/ (create note)", r.json || r.text);
  }
}

// ─────────────────────────────────────────────────────────────
// TEST 13: Publish the draft (disabled — user will confirm first)
// ─────────────────────────────────────────────────────────────
if (draftId) {
  console.log(`\n  ⏸️  Draft #${draftId} is ready. Run the publish script to make it live.`);
  console.log(`  →  node publish_draft.mjs ${draftId}`);
}

// ─────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────
console.log(`\n${"=".repeat(70)}`);
console.log("  ALL TESTS COMPLETE");
console.log(`${"=".repeat(70)}\n`);
