// Demo data for when API is not available
export const demoUser = {
  id: 1,
  email: 'demo@heyreach.com',
  created_at: new Date().toISOString()
}

export const demoAccounts = [
  {
    id: 1,
    username: 'hassan26711',
    status: 'warming',
    home_country: 'US',
    daily_msg_limit: 50,
    daily_msg_count: 0,
    risk_score: 0,
    warmup_started_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  }
]

export const demoLeads = [
  {
    id: 1,
    first_name: 'Albert',
    profile_url: 'https://www.instagram.com/albert_cancook/',
    status: 'pending',
    custom_fields: {
      industry: 'Food & Beverage',
      company: 'Cooking Channel',
      message: 'Hey Albert! Your food content is amazing. I\'d love to discuss a collaboration opportunity that could help you reach even more food enthusiasts.'
    },
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    first_name: 'Jimmy',
    profile_url: 'https://www.instagram.com/mrbeast/',
    status: 'pending',
    custom_fields: {
      industry: 'Entertainment',
      company: 'MrBeast Productions',
      message: 'Hey Jimmy! I build powerful AI agents that could automate parts of your content pipeline. Would love to show you what\'s possible.'
    },
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    first_name: 'Ryan',
    profile_url: 'https://www.instagram.com/ryantrahan/',
    status: 'pending',
    custom_fields: {
      industry: 'Entertainment',
      company: 'Content Creator',
      message: 'Hey Ryan! Love your storytelling approach. I have an AI solution that could help you scale your content creation. Interested in a quick chat?'
    },
    created_at: new Date().toISOString()
  }
]

export const demoCampaigns = [
  {
    id: 1,
    name: 'Creator AI Outreach Campaign',
    status: 'draft',
    account_ids: [1],
    lead_ids: [1, 2, 3],
    message_template: 'Hi {first_name}! I noticed your work in {industry}. {message}',
    daily_limit_per_account: 10,
    created_at: new Date().toISOString()
  }
]
