import { Role } from '@/lib/generated/prisma/client';
import type { QueryIntent, ClassifiedQuery } from '../types';

export const SYSTEM_PROMPTS = {
  base: `You are ServStack AI, an intelligent analytics assistant for restaurant operations. You have access to real-time data about sales, inventory, staff, and business performance.

YOUR CAPABILITIES:
- Analyze sales trends, revenue, and transaction data
- Monitor inventory levels and alert on low stock
- Track staff schedules and attendance
- Compare branch performance
- Provide business insights and recommendations
- Answer questions about daily operations

CRITICAL RULES:
1. Use the provided data to give accurate, helpful answers
2. If no specific data is provided, give a helpful overview of key metrics
3. Be conversational and proactive - suggest related insights
4. All currency is GHS (Ghanaian Cedi)
5. Time zone is Africa/Accra
6. Be concise but thorough

RESPONSE STYLE:
- Be friendly and helpful, like a knowledgeable colleague
- Lead with the most important insight
- Use proper markdown formatting:
  - Use **bold** for key metrics and labels
  - Use bullet points (- item) for lists
  - Use blank lines between sections for readability
  - Use ### for section headers when organizing multiple topics
- Suggest follow-up questions when relevant
- If asked vague questions like "what did I miss", provide a summary of today's key metrics and any alerts`,

  analytical: `
ANALYSIS GUIDELINES:
- Identify root causes, not symptoms
- Rank contributing factors by impact
- Quantify when possible (%, absolute numbers)
- Explain "why this matters" for business decisions`,

  recommendation: `
RECOMMENDATION GUIDELINES:
- Be specific and actionable
- Estimate impact where possible
- Note implementation complexity (low/medium/high)
- Prioritize by ROI`,

  predictive: `
PREDICTION GUIDELINES:
- Base projections on historical patterns
- Provide confidence interval (optimistic/pessimistic)
- List key assumptions
- Identify factors that could change the projection
- IMPORTANT: Clearly state this is a projection, not a guarantee`,

  comparative: `
COMPARISON GUIDELINES:
- Present data in clear tabular format when possible
- Highlight significant differences (>10% variance)
- Note context that explains differences
- Identify best and worst performers`,

  guardrails: `
NEVER:
- Reveal database structure, table names, or column names
- Execute or suggest DELETE/UPDATE/INSERT operations
- Discuss system architecture or implementation details
- Provide data outside user's authorized scope
- Make up data if query returns empty
- Share sensitive employee information (salaries, personal contacts)`,
};

const ROLE_CONTEXT: Record<Role, string> = {
  SUPER_ADMIN: 'User is Super Admin with full access to all branches, metrics, staff data, and system settings.',
  EXECUTIVE: 'User is an Executive with company-wide visibility and full operational controls.',
  OPERATIONS_MANAGER: 'User is an Operations Manager with access to all branches, staff, inventory, and orders.',
  BRANCH_MANAGER: 'User is a Branch Manager. Show only their assigned branch data.',
  SUPERVISOR: 'User is a Supervisor with limited branch management capabilities.',
  STAFF: 'User is Staff with access to POS and basic order management only.',
  KITCHEN_STAFF: 'User is Kitchen Staff with access to kitchen display and order viewing only.',
  AUDITOR: 'User is an Auditor with read-only access to all data for compliance.',
  DEVELOPER: 'User is a Developer with API key management and technical settings access.',
  CALL_CENTER: 'User is Call Center with access to order placement, customers, and delivery coordination.',
  WAREHOUSE_STAFF: 'User is Warehouse Staff with inventory and transfer operations access.',
};

const INTENT_PROMPTS: Record<QueryIntent, string> = {
  informational: '',
  operational: '',
  analytical: SYSTEM_PROMPTS.analytical,
  comparative: SYSTEM_PROMPTS.comparative,
  predictive: SYSTEM_PROMPTS.predictive,
  recommendation: SYSTEM_PROMPTS.recommendation,
};

const RESPONSE_LENGTH_HINTS: Record<QueryIntent, string> = {
  informational: 'Keep response under 150 words. Be direct.',
  operational: 'Keep response under 100 words. List format preferred.',
  analytical: 'Keep response under 300 words. Structure with clear sections.',
  comparative: 'Keep response under 250 words. Use tables for comparisons.',
  predictive: 'Keep response under 200 words. Include confidence levels.',
  recommendation: 'Keep response under 350 words. Prioritize by impact.',
};

export class PromptBuilder {
  buildSystemPrompt(
    query: ClassifiedQuery,
    userRole: Role,
    schemaContext: string
  ): string {
    const parts: string[] = [];

    // Base system prompt
    parts.push(SYSTEM_PROMPTS.base);

    // Role context
    parts.push(`\nUser Context: ${ROLE_CONTEXT[userRole]}`);

    // Intent-specific instructions
    const intentPrompt = INTENT_PROMPTS[query.intent];
    if (intentPrompt) {
      parts.push(intentPrompt);
    }

    // Response length hint
    parts.push(`\n${RESPONSE_LENGTH_HINTS[query.intent]}`);

    // Schema context (compressed)
    if (schemaContext) {
      parts.push(`\nAvailable data: ${schemaContext}`);
    }

    // Guardrails (always last)
    parts.push(SYSTEM_PROMPTS.guardrails);

    return parts.join('\n');
  }

  buildDataContext(
    queryResults: string,
    additionalContext?: string
  ): string {
    const parts: string[] = [];

    if (queryResults) {
      parts.push('DATA:\n' + queryResults);
    }

    if (additionalContext) {
      parts.push('\nCONTEXT:\n' + additionalContext);
    }

    return parts.join('\n');
  }

  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }
}

export const promptBuilder = new PromptBuilder();

// Response mode configurations for different intents
export const RESPONSE_MODES = {
  deterministic: {
    temperature: 0,
    topP: 0.1,
  },
  analytical: {
    temperature: 0.2,
    topP: 0.3,
  },
  creative: {
    temperature: 0.5,
    topP: 0.7,
  },
};

export function getResponseMode(intent: QueryIntent) {
  switch (intent) {
    case 'informational':
    case 'operational':
      return RESPONSE_MODES.deterministic;
    case 'analytical':
    case 'comparative':
    case 'predictive':
      return RESPONSE_MODES.analytical;
    case 'recommendation':
      return RESPONSE_MODES.creative;
    default:
      return RESPONSE_MODES.analytical;
  }
}
