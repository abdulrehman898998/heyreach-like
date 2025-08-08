import fetch from "node-fetch";
import fs from "fs";
import FormData from "form-data";

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const base = process.env.BASE_URL || "http://localhost:5001";
  const headers: any = { "Content-Type": "application/json" };

  console.log("Bootstrapping demo user...");
  const u = await fetch(`${base}/api/_dev/bootstrap-user`, { method: "POST", headers });
  const uj = await u.json();
  if (!uj.success) throw new Error("Failed to bootstrap user");
  const userId = uj.user.id;

  const authHeaders = { "X-User-ID": userId } as any;

  console.log("Creating Instagram account...");
  let r = await fetch(`${base}/api/accounts`, { method: "POST", headers: { ...headers, ...authHeaders }, body: JSON.stringify({ username: "hassan26711", password: "***" }) });
  console.log("Account:", await r.json());

  console.log("Preparing dummy CSV...");
  const csvPath = "./dummy_leads.csv";
  fs.writeFileSync(csvPath, `profile_url,name,company\nhttps://instagram.com/zuck,Mark,Meta\nhttps://instagram.com/instagram,IG,Meta`);

  console.log("Uploading leads CSV...");
  const form = new FormData();
  form.append("file", fs.createReadStream(csvPath));
  form.append("columnMapping", JSON.stringify({ profileUrl: "profile_url", name: "name", customFields: { company: "company" } }));
  r = await fetch(`${base}/api/leads/upload`, { method: "POST", headers: authHeaders as any, body: form as any });
  const upload = await r.json();
  console.log("Upload:", upload);
  const fileId = upload.fileId;

  console.log("Creating template...");
  r = await fetch(`${base}/api/templates`, { method: "POST", headers: { ...headers, ...authHeaders }, body: JSON.stringify({ name: "Test", content: "Hi {{name}}, from {{company}}" }) });
  const tpl = await r.json();
  console.log("Template:", tpl);
  const templateId = tpl.template.id;

  console.log("Creating campaign...");
  const startTime = new Date(Date.now() + 5_000).toISOString();
  r = await fetch(`${base}/api/campaigns`, { method: "POST", headers: { ...headers, ...authHeaders }, body: JSON.stringify({ name: "Demo", templateId, leadFileId: fileId, scheduling: { startTime, maxMessagesPerDay: 50, delayBetweenMessages: 30, accountRotation: "round-robin" } }) });
  const camp = await r.json();
  console.log("Campaign:", camp);
  const campaignId = camp.campaign.id;

  console.log("Starting campaign...");
  r = await fetch(`${base}/api/campaigns/${campaignId}/start`, { method: "POST", headers: authHeaders as any });
  console.log("Start:", await r.json());

  console.log("Checking progress...");
  r = await fetch(`${base}/api/campaigns/${campaignId}/progress`, { headers: authHeaders as any });
  console.log("Progress:", await r.json());
}

main().catch(err => { console.error(err); process.exit(1); });
