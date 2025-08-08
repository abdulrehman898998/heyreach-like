import fetch from "node-fetch";
import fs from "fs";
import FormData from "form-data";

async function testWorkingApproach() {
  try {
    console.log('Testing with working approach...');
    
    // Step 1: Bootstrap user (like the working script)
    console.log('\n1. Bootstrapping demo user...');
    const u = await fetch("http://localhost:5001/api/_dev/bootstrap-user", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" } 
    });
    const uj = await u.json();
    if (!uj.success) throw new Error("Failed to bootstrap user");
    const userId = uj.user.id;
    const authHeaders = { "X-User-ID": userId };
    
    console.log('User ID:', userId);
    
    // Step 2: Upload without column mapping (preview mode)
    console.log('\n2. Uploading without column mapping (preview mode)...');
    
    const form = new FormData();
    form.append("file", fs.createReadStream("./dummy_leads.csv"));
    // Don't append columnMapping to trigger preview mode
    
    const r = await fetch("http://localhost:5001/api/leads/upload", { 
      method: "POST", 
      headers: authHeaders, 
      body: form 
    });
    
    console.log('Response status:', r.status);
    
    if (r.ok) {
      const result = await r.json();
      console.log('✅ Success:', result);
      
      if (result.preview) {
        console.log('Available columns:', result.availableColumns);
        console.log('Suggested mapping:', result.suggestedMapping);
        console.log('Preview data:', result.preview);
        console.log('Total rows:', result.totalRows);
      }
    } else {
      const errorText = await r.text();
      console.log('❌ Error:', errorText);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testWorkingApproach();
