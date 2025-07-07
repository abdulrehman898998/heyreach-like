# Deployment Storage Guide

## Chromium Profiles Storage in Production

### Current Development Setup
- **Location**: `./chromium_profiles/` (local filesystem)
- **Content**: Browser sessions, cookies, login tokens
- **Size**: ~50-200MB per account profile
- **Persistence**: Stays on the same server/container

### Production Deployment Options

#### Option 1: Replit Deployments (Recommended)
- **Storage**: Persistent disk attached to deployment
- **Location**: `/home/runner/workspace/chromium_profiles/`
- **Persistence**: ✅ Profiles persist between app restarts
- **Scaling**: Single instance (profiles tied to specific server)
- **Backup**: Manual or automated file backup needed

#### Option 2: Cloud File Storage
- **Storage**: AWS S3, Google Cloud Storage, or similar
- **Implementation**: Upload/download profiles before/after automation
- **Persistence**: ✅ Profiles survive server changes
- **Scaling**: ✅ Multiple instances can share profiles
- **Cost**: Additional storage costs (~$1-5/month)

#### Option 3: Database Storage (Not Recommended)
- **Storage**: Store profile data as BLOB in PostgreSQL
- **Issues**: 
  - Large binary data (50-200MB per profile)
  - Database performance impact
  - Complex backup/restore
  - Not designed for file system data

### Recommended Production Architecture

```
Production App
├── Database (PostgreSQL)
│   ├── User accounts
│   ├── Campaigns
│   ├── Messages
│   └── Analytics
│
├── Persistent Disk/Volume
│   └── chromium_profiles/
│       ├── user1_account/
│       ├── user2_account/
│       └── user3_account/
│
└── Application Server
    └── Automation Engine
```

### Storage Requirements by User Scale

| Users | Storage Needed | Monthly Cost |
|-------|---------------|--------------|
| 1-10  | 1-2 GB       | Free (Replit) |
| 10-50 | 5-10 GB      | $5-10 |
| 50+   | 20+ GB       | $15-30 |

### Deployment Considerations

#### Replit Deployments
- **Pros**: Simple, persistent storage included
- **Cons**: Single instance, limited scaling
- **Best for**: 1-10 users, simple setup

#### Cloud Deployment (AWS/GCP)
- **Pros**: Scalable, professional backup
- **Cons**: More complex setup, additional costs
- **Best for**: 10+ users, production scale

#### Hybrid Approach
- **Database**: All app data (users, campaigns, analytics)
- **File Storage**: Chromium profiles only
- **Cache**: Session tokens in Redis for quick access

### Implementation Notes

1. **Never store profiles in database** - too large and inefficient
2. **Use persistent volumes** - profiles must survive container restarts
3. **Implement cleanup** - remove old/unused profiles periodically
4. **Consider encryption** - profiles contain sensitive session data
5. **Plan for scaling** - profiles are tied to specific automation servers

### Current System Status
- ✅ Profiles stored in local filesystem
- ✅ Works perfectly for single-instance deployment
- ✅ Ready for Replit Deployments
- ⏳ Cloud storage integration available if needed