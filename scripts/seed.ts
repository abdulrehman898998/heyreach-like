import { db, schema } from '../apps/web-api/src/lib/drizzle';
import { hashPassword } from '../apps/web-api/src/lib/crypto';
import { ACCOUNT_STATUS, PROXY_IP_TYPE, PROXY_STATUS, CAMPAIGN_STATUS } from '@heyreach/shared/constants';
import { WARMUP_CONFIG } from '@heyreach/shared/constants';

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Create test user
    const hashedPassword = await hashPassword('password123');
    const [user] = await db.insert(schema.users).values({
      email: 'test@heyreach.com',
      password_hash: hashedPassword,
    }).returning();

    console.log('✅ Created test user:', user.email);

    // Create UK residential proxy
    const [proxy] = await db.insert(schema.proxies).values({
      provider: 'test-provider',
      endpoint_template: 'http://user:pass@gw.provider.com:8000?session=',
      username: 'test_user',
      password: 'test_pass',
      ip_type: PROXY_IP_TYPE.RESIDENTIAL,
      country: 'GB',
      city: 'London',
      asn: 12345,
      isp: 'Test ISP',
      sticky_supported: true,
      sticky_label: 'test_session_1',
      rotation_mode: 'sticky',
      health_status: 'ok',
      latency_ms: 50,
      fail_rate: 0.01,
      score: 0.95,
      status: PROXY_STATUS.ACTIVE,
    }).returning();

    console.log('✅ Created test proxy:', proxy.id);

    // Create test account
    const [account] = await db.insert(schema.accounts).values({
      user_id: user.id,
      username: 'test_instagram_user',
      status: ACCOUNT_STATUS.WARMING,
      assigned_proxy_id: proxy.id,
      session_label: 'acc_seed_1',
      home_country: 'GB',
      home_city: 'London',
      warmup_started_at: new Date(),
      daily_msg_limit: 50,
      daily_msg_count: 0,
      risk_score: 0,
    }).returning();

    console.log('✅ Created test account:', account.username);

    // Create proxy binding
    await db.insert(schema.proxy_bindings).values({
      account_id: account.id,
      proxy_id: proxy.id,
      bound_at: new Date(),
      reason: 'initial_assignment',
    });

    console.log('✅ Created proxy binding');

    // Create test leads
    const leads = await db.insert(schema.leads).values([
      {
        user_id: user.id,
        profile_url: 'https://instagram.com/lead1',
        first_name: 'John',
        custom_fields: { company: 'Tech Corp' },
        status: 'pending',
      },
      {
        user_id: user.id,
        profile_url: 'https://instagram.com/lead2',
        first_name: 'Jane',
        custom_fields: { company: 'Design Studio' },
        status: 'pending',
      },
      {
        user_id: user.id,
        profile_url: 'https://instagram.com/lead3',
        first_name: 'Bob',
        custom_fields: { company: 'Marketing Agency' },
        status: 'pending',
      },
    ]).returning();

    console.log('✅ Created test leads:', leads.length);

    // Create test campaign
    const [campaign] = await db.insert(schema.campaigns).values({
      user_id: user.id,
      name: 'Test Campaign',
      account_ids: [account.id],
      schedule_json: {
        start_time: '09:00',
        end_time: '18:00',
        timezone: 'Europe/London',
        days_of_week: [1, 2, 3, 4, 5], // Monday to Friday
      },
      daily_limit_per_account: 10,
      status: CAMPAIGN_STATUS.DRAFT,
    }).returning();

    console.log('✅ Created test campaign:', campaign.name);

    // Update leads with campaign ID
    await db.update(schema.leads)
      .set({ campaign_id: campaign.id })
      .where(schema.leads.user_id.eq(user.id));

    console.log('✅ Updated leads with campaign ID');

    // Schedule warmup job (simulate with a delay)
    const warmupDelay = Math.floor(
      Math.random() * (WARMUP_CONFIG.PHASE_0_IDLE_MAX - WARMUP_CONFIG.PHASE_0_IDLE_MIN) + 
      WARMUP_CONFIG.PHASE_0_IDLE_MIN
    ) * 60 * 1000; // Convert to milliseconds

    console.log(`⏰ Warmup will start in ${warmupDelay / 1000 / 60} minutes`);

    // Create some baseline selectors
    const baselineSelectors = [
      {
        page_kind: 'login',
        action_kind: 'login',
        selector_text: 'input[name="username"]',
        source: 'baseline',
        success_count: 10,
        fail_count: 0,
        score: 0.95,
      },
      {
        page_kind: 'profile',
        action_kind: 'open_dm',
        selector_text: 'button[aria-label="Message"]',
        source: 'baseline',
        success_count: 8,
        fail_count: 2,
        score: 0.80,
      },
      {
        page_kind: 'dm',
        action_kind: 'send_dm',
        selector_text: 'textarea[aria-label="Message"]',
        source: 'baseline',
        success_count: 12,
        fail_count: 1,
        score: 0.92,
      },
    ];

    await db.insert(schema.selector_registry).values(baselineSelectors);

    console.log('✅ Created baseline selectors');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Test Data Summary:');
    console.log(`   User: ${user.email} (password: password123)`);
    console.log(`   Account: ${account.username} (status: ${account.status})`);
    console.log(`   Proxy: ${proxy.provider} (${proxy.ip_type}, ${proxy.country})`);
    console.log(`   Campaign: ${campaign.name} (${campaign.status})`);
    console.log(`   Leads: ${leads.length} profiles`);
    console.log(`   Selectors: ${baselineSelectors.length} baseline selectors`);
    console.log('\n🚀 You can now start the application and test the functionality!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
}

export { seed };
