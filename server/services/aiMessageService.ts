import type { MessageTemplate, CampaignTarget } from "@shared/schema";

interface AIMessageRequest {
  baseTemplate: string;
  targetProfile: {
    username?: string;
    firstName?: string;
    lastName?: string;
    bio?: string;
  };
  variables?: Record<string, string>;
  variationCount?: number;
  tone?: 'professional' | 'casual' | 'friendly' | 'sales';
  industry?: string;
}

interface AIMessageVariation {
  content: string;
  confidence: number;
  reasoning: string;
}

class AIMessageService {
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private readonly OPENAI_MODEL = "gpt-4";

  /**
   * Generate AI variations of a message template
   */
  async generateMessageVariations(request: AIMessageRequest): Promise<AIMessageVariation[]> {
    if (!this.OPENAI_API_KEY) {
      // Fallback to simple template substitution if no OpenAI key
      return this.generateFallbackVariations(request);
    }

    try {
      const variations = await this.callOpenAI(request);
      return variations;
    } catch (error) {
      console.error("OpenAI API error:", error);
      return this.generateFallbackVariations(request);
    }
  }

  /**
   * Generate personalized message for a specific target
   */
  async generatePersonalizedMessage(
    template: MessageTemplate,
    target: CampaignTarget,
    tone: string = 'professional'
  ): Promise<string> {
    const request: AIMessageRequest = {
      baseTemplate: template.baseTemplate,
      targetProfile: {
        username: target.username,
        firstName: target.firstName,
        lastName: target.lastName,
        bio: target.bio
      },
      variables: template.variables as Record<string, string>,
      variationCount: 1,
      tone: tone as any
    };

    const variations = await this.generateMessageVariations(request);
    return variations[0]?.content || this.generateFallbackMessage(template, target);
  }

  /**
   * Generate multiple variations for A/B testing
   */
  async generateABTestVariations(template: MessageTemplate, count: number = 3): Promise<string[]> {
    const request: AIMessageRequest = {
      baseTemplate: template.baseTemplate,
      targetProfile: {},
      variables: template.variables as Record<string, string>,
      variationCount: count
    };

    const variations = await this.generateMessageVariations(request);
    return variations.map(v => v.content);
  }

  /**
   * Analyze target profile and suggest optimal message approach
   */
  async analyzeTargetProfile(target: CampaignTarget): Promise<{
    suggestedTone: string;
    keyInterests: string[];
    personalizationHooks: string[];
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    if (!this.OPENAI_API_KEY) {
      return this.analyzeTargetProfileFallback(target);
    }

    try {
      const prompt = `
        Analyze this Instagram profile and suggest messaging approach:
        
        Username: ${target.username}
        Name: ${target.firstName} ${target.lastName}
        Bio: ${target.bio}
        
        Provide JSON response with:
        - suggestedTone: professional/casual/friendly/sales
        - keyInterests: array of interests from bio
        - personalizationHooks: array of conversation starters
        - riskLevel: low/medium/high (based on profile type)
      `;

      const response = await this.callOpenAI({
        baseTemplate: prompt,
        targetProfile: {},
        variationCount: 1
      });

      if (response[0]?.content) {
        try {
          return JSON.parse(response[0].content);
        } catch {
          return this.analyzeTargetProfileFallback(target);
        }
      }
    } catch (error) {
      console.error("Profile analysis error:", error);
    }

    return this.analyzeTargetProfileFallback(target);
  }

  /**
   * Generate industry-specific templates
   */
  async generateIndustryTemplate(industry: string, useCase: string): Promise<string> {
    const prompt = `
      Create a professional Instagram DM template for ${industry} industry.
      Use case: ${useCase}
      
      Requirements:
      - Professional but friendly tone
      - Include personalization placeholder {firstName}
      - Keep under 150 characters
      - Include clear call-to-action
      - Avoid spammy language
    `;

    const request: AIMessageRequest = {
      baseTemplate: prompt,
      targetProfile: {},
      variationCount: 1,
      industry
    };

    const variations = await this.generateMessageVariations(request);
    return variations[0]?.content || this.getDefaultTemplate(industry);
  }

  /**
   * Optimize message based on performance data
   */
  async optimizeMessage(
    originalMessage: string,
    performanceData: {
      responseRate: number;
      positiveReplies: number;
      totalSent: number;
    }
  ): Promise<string> {
    const prompt = `
      Optimize this Instagram DM message based on performance:
      
      Original: "${originalMessage}"
      Response Rate: ${performanceData.responseRate}%
      Positive Replies: ${performanceData.positiveReplies}/${performanceData.totalSent}
      
      Make it more engaging while maintaining professionalism.
      Keep under 150 characters.
    `;

    const request: AIMessageRequest = {
      baseTemplate: prompt,
      targetProfile: {},
      variationCount: 1
    };

    const variations = await this.generateMessageVariations(request);
    return variations[0]?.content || originalMessage;
  }

  private async callOpenAI(request: AIMessageRequest): Promise<AIMessageVariation[]> {
    const prompt = this.buildPrompt(request);
    
    const response = await fetch(`https://api.openai.com/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert Instagram marketing specialist. Generate engaging, personalized DM messages that feel authentic and drive responses.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    // Parse variations from response
    return this.parseVariations(content, request.variationCount || 1);
  }

  private buildPrompt(request: AIMessageRequest): string {
    let prompt = `Generate ${request.variationCount || 3} variations of this Instagram DM message:\n\n`;
    prompt += `Base Template: "${request.baseTemplate}"\n\n`;

    if (request.targetProfile.username || request.targetProfile.firstName) {
      prompt += `Target Profile:\n`;
      if (request.targetProfile.firstName) prompt += `- Name: ${request.targetProfile.firstName}\n`;
      if (request.targetProfile.username) prompt += `- Username: @${request.targetProfile.username}\n`;
      if (request.targetProfile.bio) prompt += `- Bio: ${request.targetProfile.bio}\n`;
      prompt += '\n';
    }

    if (request.variables) {
      prompt += `Template Variables: ${JSON.stringify(request.variables)}\n\n`;
    }

    if (request.tone) {
      prompt += `Tone: ${request.tone}\n\n`;
    }

    if (request.industry) {
      prompt += `Industry: ${request.industry}\n\n`;
    }

    prompt += `Requirements:
- Personalize using available profile information
- Keep under 150 characters
- Sound natural and conversational
- Include clear value proposition
- Avoid spammy language
- Use emojis sparingly and appropriately

Format each variation as:
Variation 1: [message content]
Variation 2: [message content]
etc.`;

    return prompt;
  }

  private parseVariations(content: string, count: number): AIMessageVariation[] {
    const variations: AIMessageVariation[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < count && i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.match(/^Variation \d+:/i) || line.match(/^\d+\./)) {
        const message = line.replace(/^Variation \d+:\s*/i, '').replace(/^\d+\.\s*/, '');
        if (message) {
          variations.push({
            content: message,
            confidence: 0.8,
            reasoning: 'AI-generated variation'
          });
        }
      }
    }

    return variations.length > 0 ? variations : [{
      content: content.trim(),
      confidence: 0.6,
      reasoning: 'Fallback parsing'
    }];
  }

  private generateFallbackVariations(request: AIMessageRequest): AIMessageVariation[] {
    const baseMessage = this.generateFallbackMessage({
      baseTemplate: request.baseTemplate,
      variables: request.variables
    } as MessageTemplate, {
      username: request.targetProfile.username,
      firstName: request.targetProfile.firstName,
      lastName: request.targetProfile.lastName,
      bio: request.targetProfile.bio
    } as CampaignTarget);

    const variations = [
      { content: baseMessage, confidence: 0.9, reasoning: 'Template substitution' },
      { content: baseMessage.replace('Hi', 'Hey'), confidence: 0.7, reasoning: 'Casual variation' },
      { content: baseMessage.replace('Hi', 'Hello'), confidence: 0.7, reasoning: 'Formal variation' }
    ];

    return variations.slice(0, request.variationCount || 3);
  }

  private generateFallbackMessage(template: MessageTemplate, target: CampaignTarget): string {
    let message = template.baseTemplate;
    
    // Replace variables
    if (template.variables) {
      Object.entries(template.variables).forEach(([key, value]) => {
        message = message.replace(new RegExp(`{${key}}`, 'g'), value);
      });
    }

    // Personalize with target info
    if (target.firstName) {
      message = message.replace(/{firstName}/g, target.firstName);
    }
    if (target.username) {
      message = message.replace(/{username}/g, target.username);
    }

    return message;
  }

  private analyzeTargetProfileFallback(target: CampaignTarget): {
    suggestedTone: string;
    keyInterests: string[];
    personalizationHooks: string[];
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const bio = target.bio?.toLowerCase() || '';
    const interests: string[] = [];
    
    // Simple keyword extraction
    if (bio.includes('entrepreneur') || bio.includes('business')) interests.push('business');
    if (bio.includes('fitness') || bio.includes('gym')) interests.push('fitness');
    if (bio.includes('travel') || bio.includes('adventure')) interests.push('travel');
    if (bio.includes('food') || bio.includes('cooking')) interests.push('food');
    if (bio.includes('tech') || bio.includes('startup')) interests.push('technology');

    return {
      suggestedTone: interests.length > 0 ? 'professional' : 'casual',
      keyInterests: interests,
      personalizationHooks: interests.map(interest => `I noticed you're into ${interest}`),
      riskLevel: bio.includes('business') ? 'low' : 'medium'
    };
  }

  private getDefaultTemplate(industry: string): string {
    const templates: Record<string, string> = {
      'fitness': 'Hi {firstName}! I noticed your fitness journey and thought you might be interested in our premium workout programs. Would love to connect! 💪',
      'business': 'Hi {firstName}! I help businesses like yours scale their Instagram presence. Would you be interested in a quick chat about your growth strategy?',
      'food': 'Hi {firstName}! Your food content is amazing! I work with restaurants and food brands to boost their Instagram reach. Would love to connect! 🍕',
      'travel': 'Hi {firstName}! Your travel photos are incredible! I help travel brands and influencers grow their Instagram presence. Would love to chat! ✈️'
    };

    return templates[industry] || 'Hi {firstName}! I noticed your profile and thought we might have some mutual interests. Would love to connect!';
  }
}

export const aiMessageService = new AIMessageService();
