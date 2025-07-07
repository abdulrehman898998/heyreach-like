# AWS Database Setup Guide

## Option 1: AWS RDS PostgreSQL (Recommended)

### Step 1: Create RDS Instance

1. **Login to AWS Console** → RDS → Create Database
2. **Engine**: PostgreSQL
3. **Version**: PostgreSQL 15.4 or higher
4. **Templates**: Free tier (for testing) or Production
5. **DB Instance Identifier**: `socialbot-pro-db`
6. **Master Username**: `socialbot_user`
7. **Master Password**: `your_secure_password` (save this!)

### Step 2: Configure Instance

```
Instance Configuration:
- Instance Class: db.t3.micro (free tier) or db.t3.small
- Storage: 20 GB GP2 SSD (minimum)
- Multi-AZ: No (for testing), Yes (for production)
- VPC: Default VPC
- Subnet Group: Default
- Public Access: Yes (for external access)
```

### Step 3: Security Group Setup

1. **Create Security Group**:
   - Name: `socialbot-pro-db-sg`
   - Description: PostgreSQL access for SocialBot Pro
   - VPC: Same as RDS instance

2. **Inbound Rules**:
   ```
   Type: PostgreSQL
   Protocol: TCP
   Port: 5432
   Source: Your IP address (for development)
   Source: 0.0.0.0/0 (for production - use with caution)
   ```

### Step 4: Database Configuration

Once RDS instance is running:

1. **Get Endpoint**: Copy the RDS endpoint URL
2. **Connect using psql**:
   ```bash
   psql -h your-rds-endpoint.amazonaws.com -U socialbot_user -d postgres
   ```

3. **Create Database**:
   ```sql
   CREATE DATABASE socialbot_pro;
   \c socialbot_pro;
   ```

4. **Run Schema Setup**:
   ```bash
   # Upload and run the schema file
   psql -h your-rds-endpoint.amazonaws.com -U socialbot_user -d socialbot_pro -f database-schema.sql
   ```

### Step 5: Environment Variables

Update your `.env` file:
```bash
DATABASE_URL=postgresql://socialbot_user:your_password@your-rds-endpoint.amazonaws.com:5432/socialbot_pro
```

## Option 2: AWS EC2 + PostgreSQL

### Step 1: Launch EC2 Instance

1. **AMI**: Ubuntu 22.04 LTS
2. **Instance Type**: t3.micro (free tier)
3. **Key Pair**: Create new or use existing
4. **Security Group**: Allow SSH (22) and PostgreSQL (5432)

### Step 2: Install PostgreSQL

```bash
# Connect to EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Step 3: Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

-- Create database and user
CREATE DATABASE socialbot_pro;
CREATE USER socialbot_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE socialbot_pro TO socialbot_user;

-- Allow remote connections
\q

# Edit configuration
sudo nano /etc/postgresql/14/main/postgresql.conf
# Change: listen_addresses = '*'

sudo nano /etc/postgresql/14/main/pg_hba.conf
# Add: host all all 0.0.0.0/0 md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Step 4: Firewall Setup

```bash
# Allow PostgreSQL port
sudo ufw allow 5432/tcp
sudo ufw enable
```

## Option 3: AWS Aurora Serverless (Advanced)

### For Production Use

1. **Create Aurora Serverless Cluster**
2. **Engine**: PostgreSQL compatible
3. **Capacity**: 0.5-1 ACU (Aurora Capacity Units)
4. **Auto Pause**: After 5 minutes of inactivity
5. **Data API**: Enable for serverless access

### Connection String for Aurora:
```bash
DATABASE_URL=postgresql://username:password@aurora-cluster-endpoint:5432/socialbot_pro
```

## Cost Estimation

### RDS Free Tier (First 12 months):
- **db.t3.micro**: Free
- **Storage**: 20 GB free
- **Backup**: 20 GB free
- **Data Transfer**: 1 GB free per month

### After Free Tier:
- **db.t3.micro**: ~$13/month
- **db.t3.small**: ~$26/month
- **Storage**: $0.115 per GB/month
- **Backup**: $0.095 per GB/month

### Aurora Serverless:
- **ACU**: $0.06 per ACU-hour
- **Storage**: $0.10 per GB/month
- **I/O**: $0.20 per million requests

## Security Best Practices

### Production Setup:
1. **Private Subnets**: Place RDS in private subnet
2. **VPC Security Groups**: Restrict access to application servers only
3. **SSL/TLS**: Enable SSL connections
4. **Encryption**: Enable encryption at rest
5. **Backup**: Enable automated backups
6. **Monitoring**: Enable CloudWatch monitoring

### Access Control:
```sql
-- Create read-only user for reporting
CREATE USER socialbot_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE socialbot_pro TO socialbot_readonly;
GRANT USAGE ON SCHEMA public TO socialbot_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO socialbot_readonly;

-- Create application user with limited permissions
CREATE USER socialbot_app WITH PASSWORD 'app_password';
GRANT CONNECT ON DATABASE socialbot_pro TO socialbot_app;
GRANT USAGE ON SCHEMA public TO socialbot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO socialbot_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO socialbot_app;
```

## Backup Strategy

### Automated Backups:
```bash
# Create daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h your-rds-endpoint.amazonaws.com -U socialbot_user socialbot_pro > backup_$DATE.sql

# Upload to S3
aws s3 cp backup_$DATE.sql s3://your-backup-bucket/database-backups/

# Clean up local backup
rm backup_$DATE.sql
```

### Restore from Backup:
```bash
# Restore database
psql -h your-rds-endpoint.amazonaws.com -U socialbot_user -d socialbot_pro < backup_file.sql
```

## Monitoring and Maintenance

### CloudWatch Metrics:
- Database Connections
- CPU Utilization  
- Free Storage Space
- Read/Write IOPS

### Performance Insights:
- Enable for detailed query performance monitoring
- Identify slow queries and optimization opportunities

### Maintenance Windows:
- Set preferred maintenance window
- Enable automatic minor version upgrades
- Monitor for security patches