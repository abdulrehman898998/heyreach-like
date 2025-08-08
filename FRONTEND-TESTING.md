# Frontend Campaign Creation Testing

## 🚀 How to Test Campaign Creation

### Option 1: Browser Console Test (Recommended)
1. Open your browser and go to: `http://localhost:5001`
2. Open Developer Tools (F12)
3. Go to Console tab
4. Copy and paste the contents of `test-campaign-creation.js`
5. Press Enter to run the test

### Option 2: Manual Frontend Testing
1. Open your browser and go to: `http://localhost:5001`
2. Login with:
   - Email: `test@example.com`
   - Password: `test123`
3. Navigate to "Campaigns" in the sidebar
4. Click "Create Campaign" button
5. Fill in the campaign details:
   - Name: "Test Campaign"
   - Message: "Hello from frontend!"
6. Click "Create Campaign"

### Option 3: API Direct Testing
Run this in PowerShell:
```powershell
$body = @{ 
    name = "PowerShell Test Campaign"; 
    message = "Created via PowerShell API call" 
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5001/api/campaigns" -Method POST -Headers @{
    "Content-Type"="application/json"; 
    "X-User-ID"="35ea256c-c107-4127-ad86-8c77b47b8461"
} -Body $body
```

## ✅ What Should Work

- ✅ Campaign creation through API
- ✅ Campaign data saved to PostgreSQL database
- ✅ Campaign retrieval and listing
- ✅ User authentication with UUID
- ✅ Account management
- ✅ Data persistence between server restarts

## 🎯 Expected Results

After running the test, you should see:
- Campaign created successfully
- Campaign ID assigned
- Campaign saved in database
- Campaign appears in campaigns list
- All data persists after server restart

## 🔧 Troubleshooting

If you encounter issues:
1. Check server is running: `npm run dev`
2. Check database connection: `docker ps` (should show PostgreSQL container)
3. Check API health: `curl http://localhost:5001/health`
4. Clear browser cache and try again

## 📊 Database Verification

To verify data is in the database:
```sql
-- Connect to PostgreSQL container
docker exec -it ig-postgres psql -U postgres -d instagram_automation

-- Check campaigns
SELECT id, name, status, created_at FROM campaigns;

-- Check users
SELECT id, email, created_at FROM users;
```
