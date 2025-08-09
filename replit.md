# 🚀 Social Metrics Dashboard - Complete Requirements & Implementation Guide

## 📋 **Project Overview**

This is a **Social Media Automation Platform** that allows users to upload CSV files with Instagram profile URLs and custom messages, then automatically send personalized outreach messages to those profiles using slash commands (similar to Clay's data enrichment software).

## 🎯 **Core Requirements**

### **1. CSV Lead Import System**
- **Upload CSV files** containing Instagram profile URLs and custom messages
- **Column Selection**: Users can select which CSV columns to import via checkboxes
- **Flexible Column Mapping**: Support for any column names (e.g., "Profiles", "messages", "name", "email", etc.)
- **Preview System**: Show users what data will be imported before final upload

### **2. Slash Command System (Like Clay)**
- **Profile URL Field**: Type `/` → select column → inserts `{{columnName}}`
- **Message Field**: Type `/` → select column → inserts `{{columnName}}`
- **Dynamic Column Detection**: Only shows columns that exist in uploaded CSV files
- **Real-time Preview**: Shows how variables will be replaced with actual data

### **3. Campaign Execution Flow**
```
1. Upload CSV → 2. Create Campaign → 3. Use Slash Commands → 4. Execute Outreach
```

**Example Flow:**
1. **Upload CSV** with columns: "Profiles", "messages"
2. **Create Campaign** and use slash commands:
   - Profile URL: Type `/` → select "Profiles" → `{{Profiles}}`
   - Message: Type `/` → select "messages" → `{{messages}}`
3. **Campaign Runs**:
   - Row 1: Navigate to `https://instagram.com/albert_cancook/`, send "Hey Albert! Your food content is 🔥..."
   - Row 2: Navigate to `https://instagram.com/mrbeast/`, send "Hey Jimmy! I build powerful AI agents..."
   - Continue for all rows...

## 🛠 **Technical Implementation**

### **Frontend (React/TypeScript)**
- **File**: `client/src/pages/campaigns/create.tsx`
- **Slash Command Logic**: 
  - Detects `/` character in input fields
  - Shows dropdown with available columns
  - Replaces `/` with `{{columnName}}` when selected
- **Preview System**: Real-time preview of how variables will be replaced

### **Backend (Node.js/Express)**
- **File**: `server/routes/templates.ts`
- **API Endpoint**: `GET /api/templates/columns`
- **Column Detection**: Reads uploaded CSV files and extracts column names
- **Returns**: Array of available columns for slash commands

### **Database (PostgreSQL)**
- **Lead Files**: Stores uploaded CSV data with column mappings
- **Campaigns**: Stores campaign configurations with variable placeholders
- **Execution**: Replaces `{{columnName}}` with actual data during outreach

## 📊 **Data Flow Architecture**

```
CSV Upload → Column Selection → Campaign Creation → Variable Replacement → Outreach
     ↓              ↓                ↓                ↓              ↓
  Parse CSV    Checkbox UI    Slash Commands    {{Profiles}}    Send Messages
     ↓              ↓                ↓                ↓              ↓
  Store Data   Save Mapping   Create Template   Real URLs      Instagram API
```

## 🎨 **User Interface Features**

### **Lead Import Page** (`/leads`)
- **File Upload**: Drag & drop or click to upload CSV
- **Column Selection**: Checkboxes for each CSV column
- **Preview**: Shows first few rows of selected data
- **Validation**: Instagram URL validation with error reporting

### **Campaign Creation Page** (`/campaigns/create`)
- **Profile URL Field**: Input with slash command support
- **Message Field**: Textarea with slash command support
- **Preview Sections**: Real-time preview of both fields
- **Account Selection**: Choose Instagram accounts for automation

### **Slash Command System**
```
Type: "Hey there! Check out my profile: /"
Click: "Profiles" 
Result: "Hey there! Check out my profile: {{Profiles}}"

Type: "My message for you: /"
Click: "messages"
Result: "My message for you: {{messages}}"
```

## 🔧 **Key Technical Features**

### **1. Dynamic Column Detection**
- **API**: `GET /api/templates/columns`
- **Logic**: Reads all uploaded CSV files and extracts column names
- **Result**: Only shows columns that actually exist in user's data

### **2. Variable Replacement System**
- **Pattern**: `{{columnName}}` → replaced with actual CSV data
- **Preview**: Shows sample data replacement in real-time
- **Execution**: Replaces variables during campaign execution

### **3. Instagram URL Validation**
- **Regex**: Flexible validation for various Instagram URL formats
- **Error Handling**: Reports invalid URLs during import
- **Support**: Handles URLs with/without trailing slashes

### **4. Campaign Execution Engine**
- **Row Processing**: Iterates through each CSV row
- **Variable Replacement**: Replaces `{{Profiles}}` with actual URLs
- **Message Sending**: Sends personalized messages to each profile

## 📁 **File Structure**

```
├── client/src/pages/
│   ├── leads.tsx              # CSV upload & column selection
│   └── campaigns/create.tsx   # Campaign creation with slash commands
├── server/
│   ├── routes/
│   │   ├── leads.ts           # CSV upload endpoints
│   │   └── templates.ts       # Column detection endpoint
│   └── services/
│       ├── leadService.ts     # CSV processing logic
│       └── templateService.ts # Column extraction logic
└── shared/schema.ts           # TypeScript interfaces
```

## 🚀 **Usage Instructions**

### **Step 1: Upload CSV**
1. Go to `/leads`
2. Upload CSV with columns like "Profiles", "messages"
3. Select which columns to import (checkboxes)
4. Click "Import Leads"

### **Step 2: Create Campaign**
1. Go to `/campaigns/create`
2. **Profile URL**: Type `/` → select "Profiles" → `{{Profiles}}`
3. **Message**: Type `/` → select "messages" → `{{messages}}`
4. Select Instagram accounts
5. Click "Create Campaign"

### **Step 3: Campaign Execution**
- System automatically processes each CSV row
- Replaces `{{Profiles}}` with actual Instagram URLs
- Replaces `{{messages}}` with actual message content
- Sends personalized messages to each profile

## 🎯 **Example CSV Format**

```csv
Profiles,messages
https://instagram.com/albert_cancook/,"Hey Albert! Your food content is 🔥. Ever thought of automating recipe replies or bookings with AI? I create custom bots for creators — happy to show a quick idea if you're open!"
https://instagram.com/mrbeast/,"Hey Jimmy! I build powerful AI agents that can handle outreach"
https://instagram.com/ryantrahan/,"Hey Ryan! Love your storytelling. I help creators build AI automations that handle replies"
```

## 🔍 **Current Status**

### **✅ Completed Features**
- CSV upload with column selection
- Slash command system in both Profile URL and Message fields
- Dynamic column detection from uploaded files
- Real-time preview system
- Instagram URL validation
- Campaign creation with variable placeholders

### **🔄 In Progress**
- Minimal UI overhaul - clean, simple design without gradients
- Essential functionality only - removed crowded elements
- Simplified navigation and layout

### **📋 Recent Minimal UI Implementation**
- **Clean Design**: Simple black/white/gray color scheme, no gradients or visual clutter
- **Essential Navigation**: Minimal sidebar with only necessary menu items
- **Simple Dashboard**: Basic stats cards and campaign table without excessive decorations
- **Streamlined Upload**: Clean file upload interface with essential functionality only
- **Reduced Complexity**: Removed crowded elements, focusing on core functionality

### **📋 Next Steps**
- Complete variable insertion system in campaign creation
- Implement actual Instagram automation backend
- Add campaign execution monitoring
- Enhance error handling and retry logic

## 💡 **Key Benefits**

1. **Clay-like Experience**: Familiar slash command interface
2. **Flexible Data**: Works with any CSV column structure
3. **Real-time Preview**: See exactly what will be sent
4. **Scalable**: Process thousands of profiles automatically
5. **User-Friendly**: Simple checkbox selection for columns

## 🛡 **Security & Best Practices**

- **Input Validation**: All CSV data is validated before processing
- **URL Sanitization**: Instagram URLs are cleaned and validated
- **Rate Limiting**: Built-in delays to avoid Instagram detection
- **Error Handling**: Comprehensive error reporting and recovery
- **Data Privacy**: User data is isolated and secure

---

**This system provides a complete Instagram outreach automation solution with a modern, user-friendly interface that mimics the best features of tools like Clay while being specifically designed for social media automation.**
