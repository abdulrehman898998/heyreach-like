import { Job } from 'bullmq';
import { getDatabase } from '../../db.js';
import { accounts, action_logs, selector_registry, notifications } from '../../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { EnhancedInstagramBot } from '../../automation/enhancedInstagramBot.js';
import { getRedis } from '../../redis.js';

interface MCPJobData {
  accountId: number;
  actionType: 'dm_send' | 'login' | 'warmup';
  targetUrl?: string;
  error: string;
  triedSelectors?: string[];
}

interface MCPAnalysisResult {
  state_classification: 'ok' | 'otp_required' | 'checkpoint' | 'captcha' | 'unknown';
  action_plan: Array<{
    tool: string;
    args: Record<string, any>;
  }>;
  new_selectors: Array<{
    page: string;
    action: string;
    selector: string;
  }>;
  user_instruction?: string;
}

export const mcpProcessor = async (job: Job<MCPJobData>) => {
  const { accountId, actionType, targetUrl, error, triedSelectors } = job.data;
  const db = getDatabase();

  console.log(`🤖 Processing MCP job for account ${accountId}, action: ${actionType}`);

  try {
    // Get account details
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, accountId),
    });

    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    // Initialize Instagram bot
    const bot = new EnhancedInstagramBot({
      headless: process.env.PLAYWRIGHT_HEADLESS === 'true',
      proxy: account.assigned_proxy_id ? {
        server: `http://proxy-${account.assigned_proxy_id}.provider.com:8000?session=${account.session_label}`,
      } : undefined,
    });

    // Capture browser state
    const browserState = await captureBrowserState(bot, accountId, actionType, targetUrl);
    
    // Send to MCP/LLM for analysis
    const analysisResult = await analyzeWithLLM(browserState, actionType, triedSelectors || []);

    // Handle analysis result
    await handleAnalysisResult(analysisResult, accountId, actionType, db);

    // Log MCP usage
    await db.insert(action_logs).values({
      account_id: accountId,
      action_type: 'mcp_analysis',
      result: 'success',
      details: { 
        actionType,
        stateClassification: analysisResult.state_classification,
        newSelectorsCount: analysisResult.new_selectors.length,
      },
    });

  } catch (error) {
    console.error(`❌ MCP job failed for account ${accountId}:`, error);
    
    // Log error
    await db.insert(action_logs).values({
      account_id: accountId,
      action_type: 'mcp_analysis',
      result: 'failed',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    throw error;
  }
};

async function captureBrowserState(
  bot: EnhancedInstagramBot, 
  accountId: number, 
  actionType: string, 
  targetUrl?: string
) {
  console.log(`📸 Capturing browser state for account ${accountId}`);

  try {
    // Navigate to target if provided
    if (targetUrl) {
      await bot.page?.goto(targetUrl, { waitUntil: 'domcontentloaded' });
      await bot.page?.waitForTimeout(3000);
    }

    // Take screenshot
    const screenshot = await bot.page?.screenshot({ 
      fullPage: true,
      type: 'png'
    });

    // Get DOM snapshot
    const domSnapshot = await bot.page?.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        elements: Array.from(document.querySelectorAll('*')).map(el => ({
          tagName: el.tagName,
          id: el.id,
          className: el.className,
          textContent: el.textContent?.substring(0, 100),
          attributes: Array.from(el.attributes).map(attr => ({
            name: attr.name,
            value: attr.value
          }))
        })).slice(0, 1000) // Limit to first 1000 elements
      };
    });

    // Get network requests (optional)
    const networkRequests = await bot.page?.evaluate(() => {
      return performance.getEntriesByType('resource').map(entry => ({
        name: entry.name,
        type: entry.entryType,
        duration: entry.duration
      }));
    });

    return {
      screenshot: screenshot ? screenshot.toString('base64') : null,
      domSnapshot,
      networkRequests,
      url: bot.page?.url(),
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error(`❌ Failed to capture browser state:`, error);
    throw error;
  }
}

async function analyzeWithLLM(
  browserState: any, 
  actionType: string, 
  triedSelectors: string[]
): Promise<MCPAnalysisResult> {
  console.log(`🧠 Analyzing with LLM for action: ${actionType}`);

  try {
    // Prepare prompt for LLM
    const prompt = createLLMPrompt(browserState, actionType, triedSelectors);

    // Send to LLM (this would be your actual LLM integration)
    // For now, we'll simulate the response
    const response = await callLLM(prompt);

    // Parse LLM response
    const analysisResult: MCPAnalysisResult = JSON.parse(response);

    return analysisResult;

  } catch (error) {
    console.error(`❌ LLM analysis failed:`, error);
    
    // Return default response for unknown state
    return {
      state_classification: 'unknown',
      action_plan: [],
      new_selectors: [],
      user_instruction: 'Manual intervention required',
    };
  }
}

function createLLMPrompt(browserState: any, actionType: string, triedSelectors: string[]): string {
  return `You are an Instagram automation assistant. Do not bypass OTP/CAPTCHA. Use at most 5 actions. Return JSON: {state_classification, action_plan[], new_selectors[], user_instruction}

Goal: ${actionType}
Context: ${JSON.stringify(browserState.domSnapshot)}
URL: ${browserState.url}
Tried selectors: ${JSON.stringify(triedSelectors)}

Analyze the current state and provide a solution.`;
}

async function callLLM(prompt: string): Promise<string> {
  // This is where you would integrate with your actual LLM service
  // For now, we'll return a mock response
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Mock response based on common scenarios
  if (prompt.includes('login')) {
    return JSON.stringify({
      state_classification: 'ok',
      action_plan: [
        { tool: 'browser_click', args: { selector: 'input[name="username"]' } },
        { tool: 'browser_type', args: { text: 'username' } },
        { tool: 'browser_click', args: { selector: 'input[name="password"]' } },
        { tool: 'browser_type', args: { text: 'password' } },
        { tool: 'browser_click', args: { selector: 'button[type="submit"]' } }
      ],
      new_selectors: [
        { page: 'login', action: 'username_input', selector: 'input[name="username"]' },
        { page: 'login', action: 'password_input', selector: 'input[name="password"]' },
        { page: 'login', action: 'submit_button', selector: 'button[type="submit"]' }
      ],
      user_instruction: null
    });
  } else if (prompt.includes('dm_send')) {
    return JSON.stringify({
      state_classification: 'ok',
      action_plan: [
        { tool: 'browser_click', args: { selector: 'a[href*="/direct/t/"]' } },
        { tool: 'browser_wait', args: { timeout: 3000 } },
        { tool: 'browser_type', args: { selector: 'textarea[placeholder*="Message"]', text: 'message' } },
        { tool: 'browser_press', args: { key: 'Enter' } }
      ],
      new_selectors: [
        { page: 'profile', action: 'message_button', selector: 'a[href*="/direct/t/"]' },
        { page: 'dm', action: 'message_input', selector: 'textarea[placeholder*="Message"]' }
      ],
      user_instruction: null
    });
  } else {
    return JSON.stringify({
      state_classification: 'unknown',
      action_plan: [],
      new_selectors: [],
      user_instruction: 'Manual intervention required'
    });
  }
}

async function handleAnalysisResult(
  result: MCPAnalysisResult, 
  accountId: number, 
  actionType: string, 
  db: any
) {
  console.log(`📋 Handling analysis result: ${result.state_classification}`);

  // Store new selectors in registry
  for (const selector of result.new_selectors) {
    await db.insert(selector_registry).values({
      page_kind: selector.page,
      action_kind: selector.action,
      selector_text: selector.selector,
      source: 'mcp',
      success_count: 1,
      score: 0.8,
      last_success_at: new Date(),
    });
  }

  // Handle different state classifications
  switch (result.state_classification) {
    case 'ok':
      // Continue with action plan
      console.log(`✅ MCP analysis successful, continuing with action plan`);
      break;

    case 'otp_required':
    case 'checkpoint':
    case 'captcha':
      // Mark account for manual verification
      await db.update(accounts)
        .set({
          status: 'needs_manual_verification',
          updated_at: new Date(),
        })
        .where(eq(accounts.id, accountId));

      // Create notification
      await db.insert(notifications).values({
        user_id: 1, // Get from account
        account_id: accountId,
        type: 'verification_required',
        channel: 'in_app',
        payload: {
          state: result.state_classification,
          instruction: result.user_instruction,
          actionType,
        },
      });

      console.log(`⚠️ Account ${accountId} marked for manual verification`);
      break;

    case 'unknown':
    default:
      // Log unknown state
      console.log(`❓ Unknown state for account ${accountId}, manual intervention may be required`);
      break;
  }
}
