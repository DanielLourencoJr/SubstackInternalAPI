const SID = "s%3AvJmAQ4jVC4UBxomauFMJMBhzI5G80zNh.2Du1LtBKC8DHPVxAMrxTR9CpjxJ5wWspBWwv6RCV8ME";
const PUB = "danielloureno.substack.com";
const COOKIE = "substack.sid=" + SID;
const IMG_DIR = "D:\\Junior\\Pins";
const MAX_IMAGES = 30;  // how many images to attempt embedding

const fs = require("fs");
const path = require("path");

// ── Lorem ipsum generator ──
const LOREM_WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "ut", "enim", "ad", "minim", "veniam", "quis", "nostrud",
  "exercitation", "ullamco", "laboris", "nisi", "ut", "aliquip", "ex", "ea",
  "commodo", "consequat", "duis", "aute", "irure", "dolor", "in", "reprehenderit",
  "in", "voluptate", "velit", "esse", "cillum", "dolore", "eu", "fugiat", "nulla",
  "pariatur", "excepteur", "sint", "occaecat", "cupidatat", "non", "proident",
  "sunt", "in", "culpa", "qui", "officia", "deserunt", "mollit", "anim", "id",
  "est", "laborum"
];

function loremParagraph(sentences = 4) {
  const words = [];
  for (let s = 0; s < sentences; s++) {
    const count = 6 + Math.floor(Math.random() * 10);
    for (let w = 0; w < count; w++) {
      words.push(LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]);
    }
    words.push(".");
  }
  return words.join(" ") + "\n\n";
}

// ── Image upload ──
async function uploadImage(filePath) {
  const buf = fs.readFileSync(filePath);
  const base64 = buf.toString("base64");
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".gif" ? "image/gif" : ext === ".webp" ? "image/webp" : "image/jpeg";
  const dataUri = `data:${mime};base64,${base64}`;

  const r = await fetch(`https://${PUB}/api/v1/image`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: COOKIE },
    body: "image=" + encodeURIComponent(dataUri),
  });
  const t = await r.text();
  const j = JSON.parse(t);
  return { ok: r.ok, url: j?.url, error: t.slice(0, 100), bytes: buf.length, name: path.basename(filePath) };
}

// ── Main ──
async function main() {
  const files = fs.readdirSync(IMG_DIR)
    .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
    .slice(0, MAX_IMAGES);

  console.log(`Found ${files.length} images. Uploading...`);

  // Upload all images
  const uploaded = [];
  const failed = [];
  let totalUploadBytes = 0;

  for (let i = 0; i < files.length; i++) {
    const filePath = path.join(IMG_DIR, files[i]);
    const result = await uploadImage(filePath);
    totalUploadBytes += result.bytes;
    if (result.ok && result.url) {
      uploaded.push(result);
      process.stdout.write(`  [${i+1}/${files.length}] ✅ ${result.name} (${(result.bytes/1024).toFixed(0)}KB)\n`);
    } else {
      failed.push(result);
      process.stdout.write(`  [${i+1}/${files.length}] ❌ ${result.name}: ${result.error}\n`);
    }
  }

  console.log(`\n--- Upload Summary ---`);
  console.log(`  Successful: ${uploaded.length}`);
  console.log(`  Failed: ${failed.length}`);
  console.log(`  Total uploaded bytes: ${(totalUploadBytes / 1024).toFixed(0)} KB`);

  if (uploaded.length === 0) {
    console.log("No images uploaded successfully. Aborting.");
    return;
  }

  // Build the draft body: alternate lorem ipsum paragraphs with images
  const content = [];
  const paraCount = Math.max(uploaded.length + 2, 20); // at least 20 paragraphs

  let imgIdx = 0;
  for (let p = 0; p < paraCount; p++) {
    // Text paragraph
    content.push({
      type: "paragraph",
      content: [{ type: "text", text: loremParagraph(3 + (p % 3)).trim() }],
    });

    // Insert an image every 2-3 paragraphs
    if (imgIdx < uploaded.length && p % 3 === 2) {
      content.push({
        type: "image2",
        attrs: { src: uploaded[imgIdx].url, alt: `Image ${imgIdx + 1}`, fullscreen: false },
      });
      imgIdx++;
    }
  }

  const draftBody = {
    type: "doc",
    attrs: { schemaVersion: "v1" },
    content,
  };

  const draftBodyStr = JSON.stringify(draftBody);
  console.log(`\n--- Draft Body ---`);
  console.log(`  Paragraphs: ${content.length}`);
  console.log(`  Images embedded: ${imgIdx}`);
  console.log(`  Raw body size: ${(draftBodyStr.length / 1024).toFixed(1)} KB`);

  const payload = {
    draft_title: `Large Draft Test — ${uploaded.length} images, ${paraCount} paragraphs`,
    draft_subtitle: `Testing size limits: ${(draftBodyStr.length / 1024).toFixed(1)}KB body, ${totalUploadBytes} bytes uploaded`,
    draft_body: draftBodyStr,
    draft_bylines: [],
    audience: "everyone",
    type: "newsletter",
    section_chosen: false,
    write_comment_permissions: "everyone",
  };

  const payloadStr = JSON.stringify(payload);
  console.log(`  Total JSON payload: ${(payloadStr.length / 1024).toFixed(1)} KB`);

  console.log(`\n--- Creating draft ---`);
  const r = await fetch(`https://${PUB}/api/v1/drafts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: COOKIE, Accept: "application/json" },
    body: payloadStr,
  });
  const t = await r.text();
  let j;
  try { j = JSON.parse(t); } catch {}

  if (r.ok && j?.id) {
    console.log(`✅ Draft created: id=${j.id}`);
    console.log(`   Title: ${j.draft_title}`);
    console.log(`   View: https://${PUB}/publish?type=draft&id=${j.id}`);
  } else {
    console.log(`❌ Status: ${r.status}`);
    console.log(`   Response: ${t.slice(0, 500)}`);
    // Try a smaller draft to isolate the issue
    if (r.status === 413 || r.status >= 500) {
      console.log(`\n⚠️  Possible size limit reached at ${(payloadStr.length / 1024).toFixed(1)} KB payload.`);
    }
  }
}

main().catch(e => console.error("Error:", e.message));
