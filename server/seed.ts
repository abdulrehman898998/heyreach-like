import { getDatabase } from './db.js';
import { users, proxies, accounts, message_templates, leads } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { initializeDatabase } from './db.js';

export async function seedDatabase() {
  await initializeDatabase();
  const db = getDatabase();
  
  console.log('🌱 Seeding database...');

  try {
    // Create test user
    const [user] = await db.insert(users).values({
      email: 'test@heyreach.com',
      password_hash: '$2b$10$dummy.hash.for.testing',
    }).returning();

    console.log('✅ Created test user');

    // Create test proxy
    const [proxy] = await db.insert(proxies).values({
      provider: 'test_provider',
      endpoint_template: 'http://user:pass@proxy.test.com:8000',
      username: 'test_user',
      password: 'test_pass',
      country: 'US',
      sticky_supported: true,
      status: 'available',
    }).returning();

    console.log('✅ Created test proxy');

    // Create test account
    const [account] = await db.insert(accounts).values({
      user_id: user.id,
      username: 'test_instagram_account',
      status: 'warmup',
      assigned_proxy_id: proxy.id,
      session_label: 'test_session_123',
      warmup_started_at: new Date(),
      daily_msg_limit: 50,
    }).returning();

    console.log('✅ Created test account');

    // Update proxy assignment
    await db.update(proxies)
      .set({
        assigned_account_id: account.id,
        status: 'assigned',
      })
      .where(eq(proxies.id, proxy.id));

    // Create test message template
    const [template] = await db.insert(message_templates).values({
      user_id: user.id,
      name: 'Default Outreach',
      content: 'Hi {{name}}! I noticed your profile and thought we might have some mutual interests. Would love to connect!',
      variables: ['name'],
      is_active: true,
    }).returning();

    console.log('✅ Created test message template');

    // Create test leads
    const testLeads = [
      {
        user_id: user.id,
        profile_url: 'https://www.instagram.com/test_user_1',
        first_name: 'John',
        custom_fields: { company: 'Tech Corp', industry: 'Technology' },
        status: 'pending',
      },
      {
        user_id: user.id,
        profile_url: 'https://www.instagram.com/test_user_2',
        first_name: 'Sarah',
        custom_fields: { company: 'Design Studio', industry: 'Creative' },
        status: 'pending',
      },
      {
        user_id: user.id,
        profile_url: 'https://www.instagram.com/test_user_3',
        first_name: 'Mike',
        custom_fields: { company: 'Startup Inc', industry: 'Entrepreneurship' },
        status: 'pending',
      },
    ];

    const createdLeads = await db.insert(leads).values(testLeads).returning();
    console.log(`✅ Created ${createdLeads.length} test leads`);

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Test Data Summary:');
    console.log(`- User: ${user.email}`);
    console.log(`- Account: ${account.username} (${account.status})`);
    console.log(`- Proxy: ${proxy.provider} (${proxy.status})`);
    console.log(`- Template: ${template.name}`);
    console.log(`- Leads: ${createdLeads.length} leads ready for campaigns`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}
