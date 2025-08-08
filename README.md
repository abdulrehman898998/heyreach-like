# Social Metrics Dashboard

A comprehensive Instagram automation and analytics platform for managing campaigns, leads, and messaging automation.

## Features

### 🎯 Campaign Management
- Create and manage Instagram DM campaigns
- Profile URL-based targeting
- Template-based messaging with variable substitution
- Multi-account campaign execution
- Real-time campaign analytics

### 📊 Lead Management
- CSV import with intelligent column mapping
- Custom field support
- Lead file management and persistence
- Preview and validation before import

### 💬 Message Templates
- Dynamic template creation with spintax support
- Variable substitution for personalization
- Template preview and testing
- Campaign-specific template assignment

### 🔐 Account Management
- Instagram account integration
- Account health monitoring
- Multi-account support for campaigns

### 📈 Analytics Dashboard
- Real-time campaign statistics
- Message delivery tracking
- Performance metrics
- Activity logs

## Recent Updates

### ✅ Column Selection for CSV Import
- **New Feature**: Users can now select which columns to import from CSV files
- **Smart Mapping**: Automatic column detection with suggested mappings
- **Preview Mode**: Real-time preview of mapped data before import
- **Flexible Fields**: Support for required (Profile URL) and optional (Name, Custom Fields) mappings

### ✅ Campaign Creation Improvements
- **Profile URL Field**: Changed from "Campaign Name" to "Profile URL" for better clarity
- **Auto-naming**: Campaigns are automatically named as "Campaign for {profileUrl}"
- **Enhanced UX**: Better form validation and user feedback

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Docker (optional, for local database)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd SocialMetricsDashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp local-env-template.txt .env
   # Edit .env with your database credentials
   ```

4. **Set up database**
   ```bash
   # Using Docker (recommended)
   docker run --name postgres-instagram -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=instagram_automation -p 5432:5432 -d postgres
   
   # Or use your existing PostgreSQL instance
   ```

5. **Push database schema**
   ```bash
   npm run db:push
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Access the application**
   - Frontend: http://localhost:5001
   - Backend API: http://localhost:5001/api

## Usage

### Importing Leads

1. **Navigate to Leads page**
2. **Upload CSV file** - The system will automatically detect columns
3. **Map columns** - Select which columns map to:
   - Profile URL (required)
   - Name (optional)
   - Custom fields (optional)
4. **Preview data** - Review the mapped data before import
5. **Import leads** - Click "Upload X Leads" to finalize

### Creating Campaigns

1. **Navigate to Campaigns page**
2. **Click "Create Campaign"**
3. **Enter Profile URL** - The target Instagram profile
4. **Select message template** - Choose from your templates
5. **Select accounts** - Choose which Instagram accounts to use
6. **Review and create** - Campaign will be automatically named

### Managing Templates

1. **Navigate to Templates page**
2. **Create new template** with variables like `{{name}}`, `{{company}}`
3. **Use spintax** for message variations: `{Hello|Hi|Hey} {{name}}`
4. **Test templates** with sample data
5. **Assign to campaigns** during campaign creation

## API Endpoints

### Leads
- `POST /api/leads/upload` - Upload CSV with column mapping
- `GET /api/leads/files` - Get uploaded lead files
- `GET /api/leads/files/:id/leads` - Get leads from specific file

### Campaigns
- `POST /api/campaigns` - Create new campaign
- `GET /api/campaigns` - Get user campaigns
- `GET /api/campaigns/:id` - Get specific campaign

### Templates
- `POST /api/templates` - Create message template
- `GET /api/templates` - Get user templates
- `GET /api/templates/columns` - Get available template columns

### Accounts
- `POST /api/accounts` - Add Instagram account
- `GET /api/accounts` - Get user accounts

## Development

### Project Structure
```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility libraries
├── server/                # Backend Node.js/Express application
│   ├── routes/            # API route handlers
│   ├── services/          # Business logic services
│   ├── automation/        # Instagram automation
│   └── scripts/           # Utility scripts
├── shared/                # Shared code between frontend/backend
│   └── schema.ts          # Database schema definitions
└── migrations/            # Database migrations
```

### Key Technologies
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Automation**: Playwright for browser automation
- **Authentication**: Custom auth system with localStorage

### Running Tests
```bash
# Test column selection functionality
npx tsx test-column-selection-ui.js

# Test leads persistence
npx tsx test-leads-persistence.js

# Test working upload approach
npx tsx test-working-approach.js
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is proprietary software. All rights reserved.

## Support

For support and questions, please contact the development team.
