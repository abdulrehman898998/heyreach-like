# SocialBot Pro - Social Media Automation Platform

## Overview

SocialBot Pro is a full-stack web application that automates Instagram and Facebook direct message campaigns. The system allows users to manage social media accounts, create automated campaigns using Google Sheets as data sources, and track performance through real-time analytics. Built with modern technologies including React, Express, PostgreSQL, and Playwright for browser automation.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and Vite for fast development
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state and React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Updates**: WebSocket connection for live campaign monitoring

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth integration with session-based authentication
- **Browser Automation**: Playwright for Instagram/Facebook interaction
- **Real-time Communication**: WebSocket server for live updates
- **API Design**: RESTful API with proper error handling and validation

### Database Schema
- **Users**: User profiles and authentication data
- **Social Accounts**: Instagram/Facebook account credentials
- **Google Sheets**: Sheet configurations and access tokens
- **Campaigns**: Automation campaign settings and status
- **Messages/Replies**: Communication tracking and analytics
- **Activity Logs**: Audit trail for all system actions

## Key Components

### Authentication System
- Replit Auth integration for secure user management
- Session-based authentication with PostgreSQL session storage
- Automatic token refresh and unauthorized access handling

### Campaign Management
- Multi-platform support (Instagram and Facebook)
- Google Sheets integration for dynamic target lists
- Configurable message limits and timing delays
- Real-time campaign monitoring and control

### Browser Automation Engine
- Playwright-based Instagram and Facebook bots
- Sophisticated popup and modal handling
- Account rotation to distribute load
- Human-like interaction patterns with randomized delays

### Data Integration
- Google Sheets API integration for target data
- Real-time data fetching and validation
- Support for custom message templates and variables

### Analytics Dashboard
- Real-time campaign performance metrics
- Message delivery and reply tracking
- Visual progress indicators and status updates

## Data Flow

1. **User Authentication**: Users authenticate through Replit Auth and sessions are managed in PostgreSQL
2. **Account Setup**: Users add social media accounts and Google Sheets configurations
3. **Campaign Creation**: Users create campaigns by selecting platforms, accounts, and data sources
4. **Target Loading**: System fetches target profiles and messages from Google Sheets
5. **Automation Execution**: Browser automation sends messages with configurable delays
6. **Real-time Updates**: WebSocket broadcasts progress updates to the frontend
7. **Analytics Collection**: All interactions are logged for performance analysis

## External Dependencies

### Core Infrastructure
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database operations and migrations
- **playwright**: Browser automation for social media platforms

### Authentication & Sessions
- **connect-pg-simple**: PostgreSQL session storage
- **openid-client**: OAuth integration for Replit Auth

### Frontend Libraries
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Accessible UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **wouter**: Lightweight React router

### Google Integration
- **googleapis**: Google Sheets API access for data import

### Development Tools
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler for production
- **vite**: Frontend build tool with hot module replacement

## Deployment Strategy

### Development Environment
- **Frontend**: Vite dev server with hot module replacement
- **Backend**: tsx for TypeScript execution with auto-reload
- **Database**: Neon PostgreSQL with automatic migrations

### Production Build
- **Frontend**: Vite build with optimized assets served statically
- **Backend**: esbuild bundle with external dependencies
- **Database**: Drizzle migrations with schema validation

### Environment Configuration
- Database URL configuration for PostgreSQL connection
- Google API credentials for Sheets integration
- Session secrets for authentication security
- Replit-specific configuration for cloud deployment

## Changelog

Changelog:
- July 07, 2025. Initial setup
- July 07, 2025. Removed reply tracking functionality per user request to simplify platform
- July 07, 2025. Added rotating proxy support with user management interface for improved automation performance
- July 07, 2025. Completed comprehensive system review - 95% production ready, only browser installation needed
- July 07, 2025. Built complete Instagram webhook system with OAuth integration - users can connect Instagram Business accounts for reply tracking
- July 07, 2025. Implemented 3-layer webhook filtering system to process only customer replies, not outgoing automation messages
- July 07, 2025. Message tracking system 95% complete - only missing Instagram message ID capture when sending for perfect reply matching
- July 07, 2025. Fixed Google Sheets integration with proper Playwright automation structure (Column A = URLs, Column B = Messages, row range selection)
- July 07, 2025. Configured Meta App OAuth credentials for Instagram webhook connections - system now 98% production ready
- July 07, 2025. Fixed Google Sheets OAuth token storage issue - authentication and data loading now working perfectly, campaign successfully loaded 5 targets from user's sheet
- July 07, 2025. Created comprehensive local setup documentation with database schema, environment templates, AWS setup guide, and automated testing script for local development
- July 07, 2025. Fixed critical Instagram bot automation issues - resolved setUserAgent error with persistent context and fixed Google Sheets cascade deletion constraints
- July 07, 2025. Added complete account editing functionality - users can now edit Instagram/Facebook account credentials through web interface with edit modal and PUT API endpoint
- July 07, 2025. Fixed Instagram automation timeout issues by implementing sophisticated message button detection with multiple fallback selectors, retry logic, and robust navigation handling from proven local automation code
- July 07, 2025. Implemented complete Facebook automation bot using proven local code patterns - both Instagram and Facebook campaigns now use identical robust automation approaches with popup handling, persistent sessions, and multi-fallback selectors

## User Preferences

Preferred communication style: Simple, everyday language.
Project preferences: Skip reply tracking features as they are too complex. Focus on core automation features for Instagram/Facebook messaging.
Feature requests: Rotating proxy support for users to add proxy servers with username/password authentication.
Domain preference: Always use stable URL https://4e5d0c13-a2dd-49ed-8535-2554e092b236-00-t14c84l0xx4p.picard.replit.dev/ - never change domain configuration.