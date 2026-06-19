const SID = "s%3AvJmAQ4jVC4UBxomauFMJMBhzI5G80zNh.2Du1LtBKC8DHPVxAMrxTR9CpjxJ5wWspBWwv6RCV8ME";
const PUBLICATION = "danielloureno.substack.com";

const draftId = process.argv[2];
if (!draftId) {
  console.error("Usage: node publish_draft.cjs <draftId>");
  process.exit(1);
}

const h = {
  "Content-Type": "application/json",
  Cookie: "substack.sid=" + SID,
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

async function main() {
  console.log(`Publishing draft #${draftId}...`);
  const r = await fetch(`https://${PUBLICATION}/api/v1/drafts/${draftId}/publish`, {
    method: "POST",
    headers: h,
  });
  const text = await r.text();
  console.log(`Status: ${r.status}`);
  try {
    const json = JSON.parse(text);
    if (r.ok) {
      const url = json.canonical_url || `https://${PUBLICATION}/p/${json.slug}`;
      console.log(`✅ Published! → ${url}`);
    } else {
      console.log("❌ Failed:", JSON.stringify(json, null, 2));
    }
  } catch {
    console.log("Response:", text.slice(0, 500));
  }
}

main();
