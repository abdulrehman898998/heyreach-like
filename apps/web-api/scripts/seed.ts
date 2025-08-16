import { db, schema } from '../src/lib/drizzle';
import { hashPassword } from '../src/lib/crypto';
import { PROXY_IP_TYPE, PROXY_STATUS, ACCOUNT_STATUS } from '@heyreach/shared/constants';

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');

    // Create test user
    const hashedPassword = await hashPassword('password123');
    const [user] = await db.insert(schema.users).values({
      email: 'test@heyreach.com',
      password_hash: hashedPassword,
    }).returning();

    console.log('✅ Created test user:', user.email);

    // Create sample proxies
    const proxies = await db.insert(schema.proxies).values([
      {
        provider: 'brightdata',
        endpoint_template: 'http://brd-customer-hl_123456789-zone-residential:password123@brd.superproxy.io:22225',
        username: 'brd-customer-hl_123456789-zone-residential',
        password: 'password123',
        ip_type: PROXY_IP_TYPE.RESIDENTIAL,
        country: 'US',
        city: 'New York',
        asn: 7922,
        isp: 'Comcast Cable',
        sticky_supported: true,
        sticky_label: 'nyc_res_1',
        rotation_mode: 'sticky',
        health_status: 'ok',
        status: PROXY_STATUS.ACTIVE,
        latency_ms: 45,
        fail_rate: 0.02,
        score: 0.95,
      },
      {
        provider: 'brightdata',
        endpoint_template: 'http://brd-customer-hl_123456789-zone-residential:password123@brd.superproxy.io:22226',
        username: 'brd-customer-hl_123456789-zone-residential',
        password: 'password123',
        ip_type: PROXY_IP_TYPE.RESIDENTIAL,
        country: 'US',
        city: 'Los Angeles',
        asn: 7922,
        isp: 'Comcast Cable',
        sticky_supported: true,
        sticky_label: 'la_res_1',
        rotation_mode: 'sticky',
        health_status: 'ok',
        status: PROXY_STATUS.ACTIVE,
        latency_ms: 52,
        fail_rate: 0.03,
        score: 0.92,
      },
      {
        provider: 'brightdata',
        endpoint_template: 'http://brd-customer-hl_123456789-zone-residential:password123@brd.superproxy.io:22227',
        username: 'brd-customer-hl_123456789-zone-residential',
        password: 'password123',
        ip_type: PROXY_IP_TYPE.RESIDENTIAL,
        country: 'GB',
        city: 'London',
        asn: 5607,
        isp: 'British Telecommunications',
        sticky_supported: true,
        sticky_label: 'london_res_1',
        rotation_mode: 'sticky',
        health_status: 'ok',
        status: PROXY_STATUS.ACTIVE,
        latency_ms: 38,
        fail_rate: 0.01,
        score: 0.98,
      },
    ]).returning();

    console.log('✅ Created', proxies.length, 'proxies');

    // Create sample accounts
    const accounts = await db.insert(schema.accounts).values([
      {
        user_id: user.id,
        username: 'test_account_1',
        status: ACCOUNT_STATUS.ACTIVE,
        assigned_proxy_id: proxies[0].id,
        session_label: 'acc_1_session',
        home_country: 'US',
        home_city: 'New York',
        warmup_started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        warmup_completed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        daily_msg_limit: 50,
        daily_msg_count: 12,
        last_msg_reset_at: new Date(),
        risk_score: 15,
        last_ip_country: 'US',
        last_ip_asn: 7922,
        last_ip_type: 'residential',
      },
      {
        user_id: user.id,
        username: 'test_account_2',
        status: ACCOUNT_STATUS.WARMING,
        assigned_proxy_id: proxies[1].id,
        session_label: 'acc_2_session',
        home_country: 'US',
        home_city: 'Los Angeles',
        warmup_started_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        daily_msg_limit: 50,
        daily_msg_count: 0,
        risk_score: 5,
        last_ip_country: 'US',
        last_ip_asn: 7922,
        last_ip_type: 'residential',
      },
    ]).returning();

    console.log('✅ Created', accounts.length, 'accounts');

    // Create proxy bindings
    await db.insert(schema.proxy_bindings).values([
      {
        account_id: accounts[0].id,
        proxy_id: proxies[0].id,
        bound_at: new Date(),
        reason: 'initial_assignment',
      },
      {
        account_id: accounts[1].id,
        proxy_id: proxies[1].id,
        bound_at: new Date(),
        reason: 'initial_assignment',
      },
    ]);

    console.log('✅ Created proxy bindings');

    // Create sample campaigns
    const campaigns = await db.insert(schema.campaigns).values([
      {
        user_id: user.id,
        name: 'Test Campaign 1',
        account_ids: [accounts[0].id],
        daily_limit_per_account: 30,
        status: 'active',
      },
      {
        user_id: user.id,
        name: 'Test Campaign 2',
        account_ids: [accounts[0].id, accounts[1].id],
        daily_limit_per_account: 25,
        status: 'draft',
      },
    ]).returning();

    console.log('✅ Created', campaigns.length, 'campaigns');

    // Create sample leads
    const leads = await db.insert(schema.leads).values([
      {
        user_id: user.id,
        campaign_id: campaigns[0].id,
        profile_url: 'https://instagram.com/test_user_1',
        first_name: 'John',
        custom_fields: { company: 'Tech Corp', industry: 'Technology' },
        status: 'sent',
      },
      {
        user_id: user.id,
        campaign_id: campaigns[0].id,
        profile_url: 'https://instagram.com/test_user_2',
        first_name: 'Sarah',
        custom_fields: { company: 'Design Studio', industry: 'Creative' },
        status: 'pending',
      },
      {
        user_id: user.id,
        campaign_id: campaigns[0].id,
        profile_url: 'https://instagram.com/test_user_3',
        first_name: 'Mike',
        custom_fields: { company: 'Marketing Agency', industry: 'Marketing' },
        status: 'failed',
      },
    ]).returning();

    console.log('✅ Created', leads.length, 'leads');

    // Create sample messages
    await db.insert(schema.messages).values([
      {
        campaign_id: campaigns[0].id,
        account_id: accounts[0].id,
        lead_id: leads[0].id,
        body_resolved: 'Hi John! I noticed your work at Tech Corp and would love to connect.',
        status: 'sent',
        sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        campaign_id: campaigns[0].id,
        account_id: accounts[0].id,
        lead_id: leads[2].id,
        body_resolved: 'Hi Mike! I noticed your work at Marketing Agency and would love to connect.',
        status: 'failed',
        error_code: 'USER_NOT_FOUND',
        attempts: 3,
      },
    ]);

    console.log('✅ Created sample messages');

    // Create sample action logs
    await db.insert(schema.action_logs).values([
      {
        account_id: accounts[0].id,
        action_type: 'login',
        target: 'instagram.com',
        result: 'success',
        details: { method: 'cookie_auth', duration_ms: 1200 },
      },
      {
        account_id: accounts[0].id,
        action_type: 'dm_send',
        target: 'test_user_1',
        result: 'success',
        details: { message_length: 45, response_time_ms: 800 },
      },
      {
        account_id: accounts[0].id,
        action_type: 'like_post',
        target: 'post_123',
        result: 'success',
        details: { post_author: 'test_user_1' },
      },
    ]);

    console.log('✅ Created sample action logs');

    // Create sample notifications
    await db.insert(schema.notifications).values([
      {
        user_id: user.id,
        account_id: accounts[0].id,
        type: 'account_warmed',
        channel: 'in_app',
        payload: { account_username: 'test_account_1', warmup_duration_days: 3 },
        is_read: false,
      },
      {
        user_id: user.id,
        account_id: accounts[0].id,
        type: 'dm_sent',
        channel: 'in_app',
        payload: { lead_name: 'John', campaign_name: 'Test Campaign 1' },
        is_read: true,
      },
    ]);

    console.log('✅ Created sample notifications');

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Test Data Summary:');
    console.log('- User:', user.email, '(password: password123)');
    console.log('- Proxies:', proxies.length);
    console.log('- Accounts:', accounts.length);
    console.log('- Campaigns:', campaigns.length);
    console.log('- Leads:', leads.length);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seed();
