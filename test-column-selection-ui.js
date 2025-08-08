import fetch from "node-fetch";
import fs from "fs";
import FormData from "form-data";

async function testColumnSelectionUI() {
  try {
    console.log('Testing column selection UI functionality...');
    
    // Step 1: Bootstrap user
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
    
    // Step 2: Upload CSV without column mapping (should trigger preview mode)
    console.log('\n2. Uploading CSV without column mapping (preview mode)...');
    
    const form = new FormData();
    form.append("file", fs.createReadStream("./dummy_leads.csv"));
    // Don't append columnMapping to trigger preview mode
    
    const uploadResponse = await fetch("http://localhost:5001/api/leads/upload", { 
      method: "POST", 
      headers: authHeaders, 
      body: form 
    });
    
    console.log('Upload response status:', uploadResponse.status);
    
    if (uploadResponse.ok) {
      const uploadResult = await uploadResponse.json();
      console.log('✅ Preview mode response:', uploadResult);
      
      if (uploadResult.preview) {
        console.log('✅ Preview mode working!');
        console.log('Available columns:', uploadResult.availableColumns);
        console.log('Suggested mapping:', uploadResult.suggestedMapping);
        console.log('Preview data:', uploadResult.preview);
        console.log('Total rows:', uploadResult.totalRows);
        
        // Step 3: Test with custom column mapping
        console.log('\n3. Testing with custom column mapping...');
        
        const customMapping = {
          profileUrl: "profile_url",
          name: "name", 
          customFields: {
            company: "company"
          }
        };
        
        const formWithMapping = new FormData();
        formWithMapping.append("file", fs.createReadStream("./dummy_leads.csv"));
        formWithMapping.append("columnMapping", JSON.stringify(customMapping));
        
        const finalUploadResponse = await fetch("http://localhost:5001/api/leads/upload", { 
          method: "POST", 
          headers: authHeaders, 
          body: formWithMapping 
        });
        
        console.log('Final upload response status:', finalUploadResponse.status);
        
        if (finalUploadResponse.ok) {
          const finalResult = await finalUploadResponse.json();
          console.log('✅ Final upload successful:', finalResult);
          console.log('File ID:', finalResult.fileId);
          console.log('Total rows:', finalResult.totalRows);
          console.log('Preview:', finalResult.preview);
        } else {
          const errorText = await finalUploadResponse.text();
          console.log('❌ Final upload failed:', errorText);
        }
      } else {
        console.log('❌ Preview mode not working as expected');
      }
    } else {
      const errorText = await uploadResponse.text();
      console.log('❌ Upload failed:', errorText);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testColumnSelectionUI();
