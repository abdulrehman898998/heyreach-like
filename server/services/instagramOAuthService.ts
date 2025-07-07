import { google } from 'googleapis';

class InstagramOAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    // These will be our Meta App credentials
    this.clientId = process.env.META_APP_ID || '';
    this.clientSecret = process.env.META_APP_SECRET || '';
    this.redirectUri = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/instagram/callback`
      : 'http://localhost:5000/api/auth/instagram/callback';
  }

  /**
   * Step 1: Generate Instagram OAuth URL for user to connect their business account
   */
  getAuthUrl(userId: string, socialAccountId: string): string {
    const state = `${userId}:${socialAccountId}`; // Encode user and account info
    const scopes = [
      'instagram_basic',
      'instagram_manage_messages',
      'pages_manage_metadata'
    ].join(',');

    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('redirect_uri', this.redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);

    return authUrl.toString();
  }

  /**
   * Check if Instagram OAuth is properly configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Step 2: Exchange authorization code for access token
   */
  async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    user_id: string;
  }> {
    const tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      code: code,
    });

    const response = await fetch(`${tokenUrl}?${params}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    return await response.json();
  }

  /**
   * Step 3: Get Instagram Business accounts for the user
   */
  async getInstagramBusinessAccounts(accessToken: string): Promise<any[]> {
    // First get Facebook pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
    );
    
    if (!pagesResponse.ok) {
      throw new Error('Failed to fetch Facebook pages');
    }

    const pagesData = await pagesResponse.json();
    const instagramAccounts = [];

    // For each page, check if it has an Instagram Business account
    for (const page of pagesData.data) {
      try {
        const igResponse = await fetch(
          `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
        );
        
        if (igResponse.ok) {
          const igData = await igResponse.json();
          if (igData.instagram_business_account) {
            // Get Instagram account details
            const igDetailsResponse = await fetch(
              `https://graph.facebook.com/v18.0/${igData.instagram_business_account.id}?fields=id,username,profile_picture_url&access_token=${page.access_token}`
            );
            
            if (igDetailsResponse.ok) {
              const igDetails = await igDetailsResponse.json();
              
              // Get business ID associated with this page (needed for webhook recipient matching)
              let businessId = null;
              try {
                const businessResponse = await fetch(
                  `https://graph.facebook.com/v18.0/${page.id}?fields=business&access_token=${page.access_token}`
                );
                if (businessResponse.ok) {
                  const businessData = await businessResponse.json();
                  businessId = businessData.business?.id || null;
                }
              } catch (error) {
                console.log(`Could not fetch business ID for page ${page.id}:`, error);
              }
              
              instagramAccounts.push({
                id: igDetails.id, // Instagram Business Account ID (for webhooks)
                username: igDetails.username,
                profile_picture_url: igDetails.profile_picture_url,
                page_id: page.id,
                page_access_token: page.access_token,
                business_id: businessId, // Business Manager ID (for recipient matching)
              });
            }
          }
        }
      } catch (error) {
        console.log(`Error checking Instagram for page ${page.id}:`, error);
      }
    }

    return instagramAccounts;
  }

  /**
   * Step 4: Subscribe to webhooks for the Instagram Business account
   */
  async subscribeToWebhooks(pageAccessToken: string, pageId: string): Promise<boolean> {
    const webhookUrl = `https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`;
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscribed_fields: 'messages,message_reactions,messaging_postbacks,messaging_seen',
        access_token: pageAccessToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to subscribe to webhooks:', error);
      return false;
    }

    return true;
  }

  /**
   * Check if webhook credentials are configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }
}

export const instagramOAuthService = new InstagramOAuthService();