const SID = "s%3AvJmAQ4jVC4UBxomauFMJMBhzI5G80zNh.2Du1LtBKC8DHPVxAMrxTR9CpjxJ5wWspBWwv6RCV8ME";
const PUB = "danielloureno.substack.com";
const COOKIE = "substack.sid=" + SID;

const draftId = process.argv[2];
if (!draftId) { console.error("Usage: node update_draft_image.cjs <draftId>"); process.exit(1); }

const fs = require("fs");
const path = require("path");

const imgPath = "D:\\Junior\\Imagens\\Pins\\Frieren yellow wallpaper.jpg";
const mimeType = "image/jpeg";
const fileName = path.basename(imgPath);

async function main() {
  // Step 1: Read file, convert to base64 data URI
  console.log("Reading image...");
  const buf = fs.readFileSync(imgPath);
  const base64 = buf.toString("base64");
  const dataUri = `data:${mimeType};base64,${base64}`;
  console.log(`  ${fileName} — ${buf.length} bytes`);

  // Step 2: Upload
  console.log("\nUploading to Substack...");
  let r = await fetch(`https://${PUB}/api/v1/image`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: COOKIE },
    body: "image=" + encodeURIComponent(dataUri),
  });
  let t = await r.text();
  let j = JSON.parse(t);
  if (!r.ok || !j.url) {
    console.log("Upload failed:", t.slice(0, 300));
    process.exit(1);
  }
  console.log("  Uploaded! URL:", j.url);

  // Step 3: Update draft with the new image
  console.log("\nUpdating draft #" + draftId + "...");
  const body = {
    draft_body: JSON.stringify({
      type: "doc",
      attrs: { schemaVersion: "v1" },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Frieren yellow wallpaper — embedded via the Substack internal API." }],
        },
        {
          type: "image2",
          attrs: { src: j.url, alt: "Frieren yellow wallpaper", fullscreen: false },
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "The image above was uploaded via POST /api/v1/image and embedded as an image2 block." }],
        },
      ],
    }),
  };

  r = await fetch(`https://${PUB}/api/v1/drafts/${draftId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: COOKIE, Accept: "application/json" },
    body: JSON.stringify(body),
  });
  t = await r.text();
  j = JSON.parse(t);
  if (r.ok) {
    console.log("  ✅ Draft updated!");
    console.log("  View at: https://" + PUB + "/publish?type=draft&id=" + draftId);
  } else {
    console.log("  ❌ Update failed:", t.slice(0, 300));
  }
}

main();
