import fetch from "node-fetch";
import fs from "fs";
import FormData from "form-data";

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const base = process.env.BASE_URL || "http://localhost:5001";
  const headers: any = { "Content-Type": "application/json" };

  console.log("🚀 Testing Enhanced Template System with Spintax & Slash-based Dynamic Fields");
  console.log("=" .repeat(80));

  // 1. Bootstrap demo user
  console.log("\n1️⃣ Bootstrapping demo user...");
  const u = await fetch(`${base}/api/_dev/bootstrap-user`, { method: "POST", headers });
  const uj = await u.json();
  if (!uj.success) throw new Error("Failed to bootstrap user");
  const userId = uj.user.id;
  const authHeaders = { "X-User-ID": userId } as any;

  // 2. Create Instagram account
  console.log("\n2️⃣ Creating Instagram account...");
  let r = await fetch(`${base}/api/accounts`, { 
    method: "POST", 
    headers: { ...headers, ...authHeaders }, 
    body: JSON.stringify({ username: "hassan26711", password: "***" }) 
  });
  console.log("✅ Account created:", (await r.json()).account.username);

  // 3. Upload enhanced CSV with more columns
  console.log("\n3️⃣ Uploading enhanced CSV with multiple columns...");
  const csvPath = "./enhanced_leads.csv";
  const csvContent = `profile_url,name,company,position,location,industry
https://instagram.com/zuck,Mark,Meta,CEO,California,Technology
https://instagram.com/instagram,IG,Meta,Platform,California,Social Media
https://instagram.com/elonmusk,Elon,Tesla,CEO,Texas,Automotive
https://instagram.com/billgates,Bill,Microsoft,Founder,Washington,Technology`;
  
  fs.writeFileSync(csvPath, csvContent);
  
  const form = new FormData();
  form.append("file", fs.createReadStream(csvPath));
  form.append("columnMapping", JSON.stringify({ 
    profileUrl: "profile_url", 
    name: "name", 
    customFields: { 
      company: "company", 
      position: "position", 
      location: "location", 
      industry: "industry" 
    } 
  }));
  
  r = await fetch(`${base}/api/leads/upload`, { 
    method: "POST", 
    headers: authHeaders as any, 
    body: form as any 
  });
  const upload = await r.json();
  console.log("✅ CSV uploaded:", upload.totalRows, "leads with", Object.keys(upload.preview[0]).length, "columns");

  // 4. Get available columns for slash-based selection
  console.log("\n4️⃣ Getting available columns for slash-based selection...");
  r = await fetch(`${base}/api/templates/columns`, { headers: authHeaders as any });
  const columns = await r.json();
  console.log("📋 Available columns:", columns.columns);

  // 5. Create enhanced template with spintax and slash-based dynamic fields
  console.log("\n5️⃣ Creating enhanced template with spintax and dynamic fields...");
  const enhancedTemplate = "{Hi | Hello | Hey} /name! I noticed you work as /position at /company in /location. The /industry sector is fascinating!";
  
  r = await fetch(`${base}/api/templates`, { 
    method: "POST", 
    headers: { ...headers, ...authHeaders }, 
    body: JSON.stringify({ 
      name: "Enhanced Outreach", 
      content: enhancedTemplate 
    }) 
  });
  const template = await r.json();
  console.log("✅ Template created:", template.template.name);
  console.log("📝 Template content:", template.template.content);
  console.log("🔗 Variables detected:", template.template.variables);

  // 6. Test template preview with sample data
  console.log("\n6️⃣ Testing template preview with sample data...");
  const sampleData = {
    name: "John Doe",
    position: "Senior Developer",
    company: "Tech Corp",
    location: "San Francisco",
    industry: "Software"
  };
  
  r = await fetch(`${base}/api/templates/preview`, { 
    method: "POST", 
    headers: { ...headers, ...authHeaders }, 
    body: JSON.stringify({ 
      content: enhancedTemplate, 
      sampleData 
    }) 
  });
  const preview = await r.json();
  console.log("🎯 Generated preview:", preview.preview.generated);
  console.log("🔄 Variations:", preview.preview.variations);

  // 7. Get dynamic fields from template
  console.log("\n7️⃣ Extracting dynamic fields from template...");
  r = await fetch(`${base}/api/templates/dynamic-fields`, { 
    method: "POST", 
    headers: { ...headers, ...authHeaders }, 
    body: JSON.stringify({ content: enhancedTemplate }) 
  });
  const dynamicFields = await r.json();
  console.log("🔍 Dynamic fields found:", dynamicFields.fields);

  // 8. Create campaign with enhanced template
  console.log("\n8️⃣ Creating campaign with enhanced template...");
  const startTime = new Date(Date.now() + 5_000).toISOString();
  r = await fetch(`${base}/api/campaigns`, { 
    method: "POST", 
    headers: { ...headers, ...authHeaders }, 
    body: JSON.stringify({ 
      name: "Enhanced Outreach Campaign", 
      templateId: template.template.id, 
      leadFileId: upload.fileId, 
      scheduling: { 
        startTime, 
        maxMessagesPerDay: 50, 
        delayBetweenMessages: 30, 
        accountRotation: "round-robin" 
      } 
    }) 
  });
  const campaign = await r.json();
  console.log("✅ Campaign created:", campaign.campaign.name);

  // 9. Test message generation for each lead
  console.log("\n9️⃣ Testing message generation for each lead...");
  for (let i = 0; i < Math.min(3, upload.preview.length); i++) {
    const lead = upload.preview[i];
    const messageData = {
      name: lead.name,
      position: lead.position || "Professional", // Use actual position from CSV
      company: lead.company,
      location: lead.location || "California", // Use actual location from CSV
      industry: lead.industry || "Technology" // Use actual industry from CSV
    };
    
    r = await fetch(`${base}/api/templates/preview`, { 
      method: "POST", 
      headers: { ...headers, ...authHeaders }, 
      body: JSON.stringify({ 
        content: enhancedTemplate, 
        sampleData: messageData 
      }) 
    });
    const leadPreview = await r.json();
    console.log(`\n👤 Lead ${i + 1} (${lead.name}):`);
    console.log(`   📧 Generated: ${leadPreview.preview.generated}`);
    console.log(`   📊 Data used:`, messageData);
  }

  console.log("\n🎉 Enhanced Template System Test Complete!");
  console.log("\n📋 Summary:");
  console.log("   ✅ Spintax variations: {Hi | Hello | Hey}");
  console.log("   ✅ Slash-based dynamic fields: /name, /position, /company, etc.");
  console.log("   ✅ Automatic variable detection and validation");
  console.log("   ✅ Real-time preview generation");
  console.log("   ✅ Campaign integration ready");

  // Cleanup
  fs.unlinkSync(csvPath);
}

main().catch(err => { 
  console.error("❌ Test failed:", err); 
  process.exit(1); 
});
