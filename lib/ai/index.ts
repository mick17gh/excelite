import { Role } from '@prisma/client';
import { providerFactory } from './providers';
import { queryClassifier } from './orchestration/classifier';
import { promptBuilder, getResponseMode } from './orchestration/prompts';
import { queryBuilder } from './data/query-builder';
import { resultSummarizer } from './data/result-summarizer';
import { compressSchemaForPrompt, getSchemaForRole } from './data/schema-registry';
import { inputGuardrails, outputGuardrails } from './security/guardrails';
import { getKPIData, getSalesByChannel, getSalesByDaypart, getTopMenuItems, getHourlySalesData } from '@/lib/actions/transactions';
import { getActiveAlerts } from '@/lib/actions/alerts';
import { getLowStockItems, getInventoryItems } from '@/lib/actions/inventory';
import { getStaffSummary, getStaff } from '@/lib/actions/staff';
import { getBranches, getBranchPerformance } from '@/lib/actions/branches';
import { getTargets } from '@/lib/actions/targets';
import { getMenuItems } from '@/lib/actions/menu';
import type {
  ChatRequest,
  ChatResponse,
  LLMProvider,
  SelectionMode,
  ClassifiedQuery,
} from './types';

export interface ChatServiceConfig {
  defaultProvider?: LLMProvider;
  defaultSelectionMode?: SelectionMode;
  maxTokens?: number;
}

const DEFAULT_CONFIG: ChatServiceConfig = {
  defaultProvider: 'deepseek',
  defaultSelectionMode: 'auto-balanced',
  maxTokens: 2000,
};

export class ChatService {
  private config: ChatServiceConfig;

  constructor(config: ChatServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();

    // 1. Validate input
    const validation = inputGuardrails.validate(request.message);
    if (!validation.valid) {
      return this.createBlockedResponse(validation.reason || 'Invalid input', startTime);
    }

    const sanitizedMessage = validation.sanitizedInput || request.message;

    // 2. Classify the query
    const classifiedQuery = queryClassifier.classify(sanitizedMessage);

    // 3. Select provider
    const selectionMode = request.selectionMode || this.config.defaultSelectionMode!;
    const providerChoice = request.provider
      ? { provider: request.provider, model: this.getDefaultModel(request.provider), reason: 'Manual selection' }
      : providerFactory.selectProvider(classifiedQuery, selectionMode);

    // 4. Execute data queries (always fetch data for context)
    const queryResults = await this.executeQueries(
      classifiedQuery,
      request.context.userRole,
      request.context.branchId
    );
    const queryResultsText = queryResults.text;
    const templatesUsed = queryResults.templatesUsed;

    // 5. Build prompt
    const schemaContext = compressSchemaForPrompt(getSchemaForRole(request.context.userRole));
    const systemPrompt = promptBuilder.buildSystemPrompt(
      classifiedQuery,
      request.context.userRole,
      schemaContext
    );

    const dataContext = promptBuilder.buildDataContext(queryResultsText);
    const responseMode = getResponseMode(classifiedQuery.intent);

    // 6. Build messages
    const messages = [
      ...request.context.previousMessages.slice(-6), // Keep last 6 messages for context
      { role: 'user' as const, content: dataContext ? `${sanitizedMessage}\n\n${dataContext}` : sanitizedMessage },
    ];

    // 7. Call LLM with failover
    const { result: llmResponse, usedProvider } = await providerFactory.executeWithFailover(
      providerChoice.provider,
      (provider) =>
        provider.complete({
          messages,
          systemPrompt,
          maxTokens: this.config.maxTokens,
          temperature: responseMode.temperature,
          topP: responseMode.topP,
        })
    );

    // 8. Sanitize output
    const sanitizedContent = outputGuardrails.sanitize(llmResponse.content);

    const totalLatency = Date.now() - startTime;

    return {
      content: sanitizedContent,
      provider: usedProvider,
      model: llmResponse.model,
      usage: {
        inputTokens: llmResponse.usage.inputTokens,
        outputTokens: llmResponse.usage.outputTokens,
        cost: llmResponse.usage.cost,
      },
      latencyMs: totalLatency,
      cached: llmResponse.cached,
      templateUsed: templatesUsed.length > 0 ? templatesUsed.join(', ') : undefined,
    };
  }

  async *streamMessage(request: ChatRequest): AsyncGenerator<string, ChatResponse, unknown> {
    const startTime = Date.now();

    // Validation
    const validation = inputGuardrails.validate(request.message);
    if (!validation.valid) {
      yield `Error: ${validation.reason || 'Invalid input'}`;
      return this.createBlockedResponse(validation.reason || 'Invalid input', startTime);
    }

    const sanitizedMessage = validation.sanitizedInput || request.message;
    const classifiedQuery = queryClassifier.classify(sanitizedMessage);

    // Select provider
    const selectionMode = request.selectionMode || this.config.defaultSelectionMode!;
    const providerChoice = request.provider
      ? { provider: request.provider, model: this.getDefaultModel(request.provider), reason: 'Manual selection' }
      : providerFactory.selectProvider(classifiedQuery, selectionMode);

    // Execute queries (always fetch data for context)
    const queryResults = await this.executeQueries(
      classifiedQuery,
      request.context.userRole,
      request.context.branchId
    );
    const queryResultsText = queryResults.text;
    const templatesUsed = queryResults.templatesUsed;

    // Build prompt
    const schemaContext = compressSchemaForPrompt(getSchemaForRole(request.context.userRole));
    const systemPrompt = promptBuilder.buildSystemPrompt(
      classifiedQuery,
      request.context.userRole,
      schemaContext
    );

    const dataContext = promptBuilder.buildDataContext(queryResultsText);
    const responseMode = getResponseMode(classifiedQuery.intent);

    const messages = [
      ...request.context.previousMessages.slice(-6),
      { role: 'user' as const, content: dataContext ? `${sanitizedMessage}\n\n${dataContext}` : sanitizedMessage },
    ];

    // Stream from LLM
    const provider = providerFactory.getProvider(providerChoice.provider);
    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const stream = provider.stream({
        messages,
        systemPrompt,
        maxTokens: this.config.maxTokens,
        temperature: responseMode.temperature,
        topP: responseMode.topP,
      });

      for await (const chunk of stream) {
        if (chunk.content) {
          fullContent += chunk.content;
          yield chunk.content;
        }
      }

      // Estimate tokens
      inputTokens = provider.countTokens(systemPrompt + messages.map((m) => m.content).join(' '));
      outputTokens = provider.countTokens(fullContent);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      yield `\n\nError: ${errorMessage}`;
    }

    const totalLatency = Date.now() - startTime;
    const sanitizedContent = outputGuardrails.sanitize(fullContent);

    return {
      content: sanitizedContent,
      provider: providerChoice.provider,
      model: providerChoice.model,
      usage: {
        inputTokens,
        outputTokens,
        cost: provider.estimateCost(inputTokens, outputTokens),
      },
      latencyMs: totalLatency,
      cached: false,
      templateUsed: templatesUsed.length > 0 ? templatesUsed.join(', ') : undefined,
    };
  }

  private async executeQueries(
    query: ClassifiedQuery,
    userRole: Role,
    branchId: string | null
  ): Promise<{ text: string; templatesUsed: string[] }> {
    const templatesUsed: string[] = [];
    const results: string[] = [];

    try {
      // Always fetch real dashboard data for accuracy
      const branchIds = branchId ? [branchId] : undefined;
      
      // Determine date range from query or default to last 30 days
      let queryStartDate: Date;
      let queryEndDate: Date;
      let periodLabel: string;
      
      if (query.timeRange?.startDate && query.timeRange?.endDate) {
        // Use dates from classified query
        queryStartDate = query.timeRange.startDate;
        queryEndDate = query.timeRange.endDate;
        periodLabel = `${queryStartDate.toLocaleDateString()} - ${queryEndDate.toLocaleDateString()}`;
      } else if (query.timeRange?.value) {
        // Parse period keywords
        const now = new Date();
        queryEndDate = new Date();
        queryEndDate.setHours(23, 59, 59, 999);
        
        switch (query.timeRange.value.toLowerCase()) {
          case 'today':
            queryStartDate = new Date();
            queryStartDate.setHours(0, 0, 0, 0);
            periodLabel = 'Today';
            break;
          case 'yesterday':
            queryStartDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            queryStartDate.setHours(0, 0, 0, 0);
            queryEndDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            queryEndDate.setHours(23, 59, 59, 999);
            periodLabel = 'Yesterday';
            break;
          case 'this_week':
          case 'week':
            const dayOfWeek = now.getDay();
            queryStartDate = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
            queryStartDate.setHours(0, 0, 0, 0);
            periodLabel = 'This Week';
            break;
          case 'this_month':
          case 'month':
          case 'january':
          case 'february':
          case 'march':
          case 'april':
          case 'may':
          case 'june':
          case 'july':
          case 'august':
          case 'september':
          case 'october':
          case 'november':
          case 'december':
            // Handle month names
            const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
            const monthIndex = monthNames.indexOf(query.timeRange.value.toLowerCase());
            if (monthIndex !== -1) {
              const year = now.getMonth() >= monthIndex ? now.getFullYear() : now.getFullYear() - 1;
              queryStartDate = new Date(year, monthIndex, 1);
              queryEndDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
              periodLabel = `${query.timeRange.value.charAt(0).toUpperCase() + query.timeRange.value.slice(1)} ${year}`;
            } else {
              queryStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
              periodLabel = 'This Month';
            }
            break;
          default:
            // Default to last 30 days
            queryStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            queryStartDate.setHours(0, 0, 0, 0);
            periodLabel = 'Last 30 Days';
        }
      } else {
        // Default to last 30 days (matching dashboard default)
        queryEndDate = new Date();
        queryEndDate.setHours(23, 59, 59, 999);
        queryStartDate = new Date(queryEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        queryStartDate.setHours(0, 0, 0, 0);
        periodLabel = 'Last 30 Days';
      }
      
      // Get KPI data for the query period
      const kpiResult = await getKPIData(branchIds, queryStartDate, queryEndDate);
      if (kpiResult.success && kpiResult.data) {
        const kpi = kpiResult.data;
        results.push(`[${periodLabel} Sales Overview]
Total Revenue: GHS ${kpi.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
Transaction Count: ${kpi.transactionCount}
Average Ticket: GHS ${kpi.averageTicket.toFixed(2)}
COGS %: ${kpi.cogsPercentage.toFixed(1)}%
Profit Margin: ${kpi.profitMargin.toFixed(1)}%`);
        templatesUsed.push('kpi_data');
      }

      // Get sales by channel for the query period
      const channelResult = await getSalesByChannel(branchId || undefined, queryStartDate, queryEndDate);
      if (channelResult.success && channelResult.data && channelResult.data.length > 0) {
        const channelData = channelResult.data
          .map((c: { channel: string; revenue: number; percentage: number }) => 
            `${c.channel}: GHS ${c.revenue.toLocaleString()} (${c.percentage}%)`)
          .join('\n');
        results.push(`[Sales by Channel]\n${channelData}`);
        templatesUsed.push('sales_by_channel');
      }

      // Get active alerts
      const alertsResult = await getActiveAlerts();
      if (alertsResult.success && alertsResult.data && alertsResult.data.length > 0) {
        const alertsSummary = alertsResult.data.slice(0, 5)
          .map((a: { type: string; severity: string; message: string }) => 
            `[${a.severity}] ${a.type}: ${a.message}`)
          .join('\n');
        results.push(`[Active Alerts - ${alertsResult.data.length} total]\n${alertsSummary}`);
        templatesUsed.push('active_alerts');
      }

      // Get low stock items
      const lowStockResult = await getLowStockItems();
      if (lowStockResult.success && lowStockResult.data && lowStockResult.data.length > 0) {
        const lowStockItems = lowStockResult.data.slice(0, 5)
          .map((i: { name: string; currentStock: number; reorderPoint: number; branchName?: string }) => 
            `${i.name}: ${i.currentStock} units (reorder at ${i.reorderPoint})${i.branchName ? ` - ${i.branchName}` : ''}`)
          .join('\n');
        results.push(`[Low Stock Items - ${lowStockResult.data.length} items]\n${lowStockItems}`);
        templatesUsed.push('low_stock_items');
      }

      // Get sales by daypart for the query period
      const daypartResult = await getSalesByDaypart(branchId || undefined, queryStartDate, queryEndDate);
      if (daypartResult.success && daypartResult.data && daypartResult.data.length > 0) {
        const daypartData = daypartResult.data
          .map((d: { daypart: string; revenue: number; transactions: number }) => 
            `${d.daypart}: GHS ${d.revenue.toLocaleString()} (${d.transactions} orders)`)
          .join('\n');
        results.push(`[Sales by Daypart]\n${daypartData}`);
        templatesUsed.push('sales_by_daypart');
      }

      // Get top menu items for the query period
      const topItemsResult = await getTopMenuItems(branchId || undefined, queryStartDate, queryEndDate);
      if (topItemsResult.success && topItemsResult.data) {
        const { top, worst } = topItemsResult.data as { top: Array<{ name: string; quantity: number; revenue: number }>; worst: Array<{ name: string; quantity: number; revenue: number }> };
        if (top && top.length > 0) {
          const topItems = top.slice(0, 5)
            .map((i, idx) => `${idx + 1}. ${i.name}: ${i.quantity} sold (GHS ${i.revenue.toLocaleString()})`)
            .join('\n');
          results.push(`[Top Selling Items]\n${topItems}`);
          templatesUsed.push('top_menu_items');
        }
        if (worst && worst.length > 0) {
          const worstItems = worst.slice(0, 3)
            .map((i, idx) => `${idx + 1}. ${i.name}: ${i.quantity} sold (GHS ${i.revenue.toLocaleString()})`)
            .join('\n');
          results.push(`[Worst Performing Items]\n${worstItems}`);
          templatesUsed.push('worst_menu_items');
        }
      }

      // Get hourly sales pattern
      const hourlyResult = await getHourlySalesData(branchId || undefined, 1);
      if (hourlyResult.success && hourlyResult.data && hourlyResult.data.length > 0) {
        const peakHours = hourlyResult.data
          .sort((a: { revenue: number }, b: { revenue: number }) => b.revenue - a.revenue)
          .slice(0, 3)
          .map((h: { hour: string; revenue: number; transactions: number }) => 
            `${h.hour}:00 - GHS ${h.revenue.toLocaleString()} (${h.transactions} orders)`)
          .join('\n');
        results.push(`[Peak Hours Today]\n${peakHours}`);
        templatesUsed.push('hourly_sales');
      }

      // Get staff summary
      const staffResult = await getStaffSummary();
      if (staffResult.success && staffResult.data && staffResult.data.length > 0) {
        const staffSummary = staffResult.data
          .map((b: { branchName: string; totalStaff: number; onDuty: number; required: number; status: string }) => 
            `${b.branchName}: ${b.onDuty}/${b.required} on duty (${b.status})`)
          .join('\n');
        results.push(`[Staff Status by Branch]\n${staffSummary}`);
        templatesUsed.push('staff_summary');
      }

      // Get branch performance for the query period
      const branchPerfResult = await getBranchPerformance(queryStartDate, queryEndDate);
      if (branchPerfResult.success && branchPerfResult.data && branchPerfResult.data.length > 0) {
        const branchPerf = branchPerfResult.data
          .slice(0, 5)
          .map((b: { name: string; revenue: number; transactions: number; performance: number; status: string }) => 
            `${b.name}: GHS ${b.revenue.toLocaleString()} (${b.transactions} txns, ${b.performance.toFixed(0)}% of target - ${b.status})`)
          .join('\n');
        results.push(`[Branch Performance - ${periodLabel}]\n${branchPerf}`);
        templatesUsed.push('branch_performance');
      }

      // Get all branches info
      const branchesResult = await getBranches();
      if (branchesResult.success && branchesResult.data) {
        const activeBranches = branchesResult.data.filter((b: { isActive: boolean }) => b.isActive);
        results.push(`[Branches Overview]
Total Active Branches: ${activeBranches.length}
Locations: ${activeBranches.map((b: { name: string }) => b.name).join(', ')}`);
        templatesUsed.push('branches_overview');
      }

      // Get targets/KPIs
      const targetsResult = await getTargets();
      if (targetsResult.success && targetsResult.data && targetsResult.data.length > 0) {
        const activeTargets = targetsResult.data
          .filter((t: { isActive: boolean }) => t.isActive)
          .slice(0, 5)
          .map((t: { branch?: { name: string }; targetType: string; targetValue: number; currentValue: number }) => {
            const branchName = t.branch?.name || 'Unknown';
            const progress = t.targetValue > 0 ? (t.currentValue / t.targetValue) * 100 : 0;
            return `${branchName} - ${t.targetType}: ${progress.toFixed(0)}% (${t.currentValue.toFixed(0)}/${t.targetValue})`;
          })
          .join('\n');
        if (activeTargets) {
          results.push(`[Active Targets & Progress]\n${activeTargets}`);
          templatesUsed.push('targets');
        }
      }

      // Get menu items summary
      const menuResult = await getMenuItems();
      if (menuResult.success && menuResult.data) {
        const categories = [...new Set(menuResult.data.map((i: { category: string }) => i.category))];
        const totalItems = menuResult.data.length;
        const avgPrice = menuResult.data.reduce((sum: number, i: { price: number }) => sum + Number(i.price), 0) / totalItems;
        results.push(`[Menu Overview]
Total Items: ${totalItems}
Categories: ${categories.join(', ')}
Average Price: GHS ${avgPrice.toFixed(2)}`);
        templatesUsed.push('menu_overview');
      }

      // Get inventory summary
      const inventoryResult = await getInventoryItems();
      if (inventoryResult.success && inventoryResult.data) {
        const totalItems = inventoryResult.data.length;
        const lowStock = inventoryResult.data.filter((i: { currentStock: number; reorderPoint: number }) => 
          Number(i.currentStock) <= Number(i.reorderPoint)).length;
        const totalValue = inventoryResult.data.reduce((sum: number, i: { currentStock: number; unitCost: number }) => 
          sum + (Number(i.currentStock) * Number(i.unitCost)), 0);
        results.push(`[Inventory Overview]
Total Items: ${totalItems}
Low Stock Items: ${lowStock}
Total Inventory Value: GHS ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        templatesUsed.push('inventory_overview');
      }

      // Also try template-based queries for specific requests
      if (query.suggestedTemplates.length > 0) {
        for (const templateId of query.suggestedTemplates.slice(0, 2)) {
          try {
            const result = await queryBuilder.execute(
              templateId,
              {
                branchId: branchId || undefined,
                startDate: query.timeRange?.startDate,
                endDate: query.timeRange?.endDate,
                period: query.timeRange?.value || 'today',
              },
              { userId: '', role: userRole, branchId }
            );

            if (result.success && result.data && (Array.isArray(result.data) ? result.data.length > 0 : Object.keys(result.data).length > 0)) {
              const dataToSummarize = Array.isArray(result.data) ? result.data : [result.data];
              const summarized = resultSummarizer.summarize(dataToSummarize);
              const formatted = resultSummarizer.formatForPrompt(summarized);
              results.push(`[${templateId}]\n${formatted}`);
              templatesUsed.push(templateId);
            }
          } catch (error) {
            console.error(`Query template ${templateId} failed:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }

    return {
      text: results.join('\n\n'),
      templatesUsed,
    };
  }

  private createBlockedResponse(reason: string, startTime: number): ChatResponse {
    return {
      content: `I cannot process this request. ${reason}`,
      provider: 'openai',
      model: 'gpt-4o-mini',
      usage: { inputTokens: 0, outputTokens: 0, cost: 0 },
      latencyMs: Date.now() - startTime,
      cached: false,
    };
  }

  private getDefaultModel(provider: LLMProvider): string {
    switch (provider) {
      case 'openai':
        return 'gpt-4o-mini';
      case 'deepseek':
        return 'deepseek-chat';
      case 'gemini':
        return 'gemini-1.5-flash';
    }
  }
}

export const chatService = new ChatService();

// Re-export types and utilities
export * from './types';
export { queryClassifier } from './orchestration/classifier';
export { providerFactory } from './providers';
export { queryBuilder } from './data/query-builder';
export { inputGuardrails, outputGuardrails } from './security/guardrails';
