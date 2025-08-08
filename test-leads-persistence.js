import fetch from "node-fetch";
import fs from "fs";
import FormData from "form-data";

async function testLeadsPersistence() {
  try {
    console.log('Testing leads persistence...');
    
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
    
    // Step 2: Upload CSV with column mapping (should persist to database)
    console.log('\n2. Uploading CSV with column mapping...');
    
    const form = new FormData();
    form.append("file", fs.createReadStream("./dummy_leads.csv"));
    form.append("columnMapping", JSON.stringify({
      profileUrl: "profile_url",
      name: "name", 
      customFields: {
        company: "company"
      }
    }));
    
    const uploadResponse = await fetch("http://localhost:5001/api/leads/upload", { 
      method: "POST", 
      headers: authHeaders, 
      body: form 
    });
    
    console.log('Upload response status:', uploadResponse.status);
    
    if (uploadResponse.ok) {
      const uploadResult = await uploadResponse.json();
      console.log('✅ Upload successful:', uploadResult);
      
      if (uploadResult.fileId) {
        console.log('File ID:', uploadResult.fileId);
        
        // Step 3: Fetch lead files to verify persistence
        console.log('\n3. Fetching lead files to verify persistence...');
        
        const filesResponse = await fetch("http://localhost:5001/api/leads/files", { 
          headers: authHeaders 
        });
        
        console.log('Files response status:', filesResponse.status);
        
        if (filesResponse.ok) {
          const filesResult = await filesResponse.json();
          console.log('✅ Lead files retrieved:', filesResult);
          
          if (filesResult.files && filesResult.files.length > 0) {
            console.log('Found lead files:');
            filesResult.files.forEach((file, index) => {
              console.log(`  ${index + 1}. ${file.name} - ${file.totalRows} leads`);
            });
            
            // Step 4: Get leads from the first file
            console.log('\n4. Getting leads from the first file...');
            
            const firstFile = filesResult.files[0];
            const leadsResponse = await fetch(`http://localhost:5001/api/leads/files/${firstFile.id}/leads`, { 
              headers: authHeaders 
            });
            
            console.log('Leads response status:', leadsResponse.status);
            
            if (leadsResponse.ok) {
              const leadsResult = await leadsResponse.json();
              console.log('✅ Leads retrieved:', leadsResult);
              console.log(`Found ${leadsResult.leads.length} leads`);
              leadsResult.leads.forEach((lead, index) => {
                console.log(`  ${index + 1}. ${lead.profileUrl} - ${lead.name || 'No name'}`);
              });
            } else {
              const errorText = await leadsResponse.text();
              console.log('❌ Failed to get leads:', errorText);
            }
          } else {
            console.log('❌ No lead files found');
          }
        } else {
          const errorText = await filesResponse.text();
          console.log('❌ Failed to get lead files:', errorText);
        }
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

testLeadsPersistence();
