import { db } from '@/lib/db';
import { createHash } from 'crypto';
import type { AuditEntry, LLMProvider, QueryIntent } from '../types';

export class ChatAuditor {
  async log(entry: Omit<AuditEntry, 'queryHash'>): Promise<string> {
    const queryHash = this.hashQuery(entry.query);

    const record = await db.chatAuditLog.create({
      data: {
        userId: entry.userId,
        sessionId: entry.sessionId,
        query: entry.query,
        queryHash,
        intent: entry.intent,
        provider: entry.provider,
        model: entry.model,
        templatesUsed: entry.templatesUsed,
        entitiesAccessed: entry.entitiesAccessed,
        branchesAccessed: entry.branchesAccessed,
        inputTokens: entry.inputTokens,
        outputTokens: entry.outputTokens,
        totalCost: entry.totalCost,
        latencyMs: entry.latencyMs,
        cached: entry.cached,
        blocked: entry.blocked,
        blockReason: entry.blockReason,
      },
    });

    // Update daily metrics
    await this.updateDailyMetrics(entry);

    return record.id;
  }

  private async updateDailyMetrics(entry: Omit<AuditEntry, 'queryHash'>): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      await db.chatMetric.upsert({
        where: {
          date_provider_model: {
            date: today,
            provider: entry.provider,
            model: entry.model,
          },
        },
        update: {
          totalQueries: { increment: 1 },
          totalTokens: { increment: entry.inputTokens + entry.outputTokens },
          totalCost: { increment: entry.totalCost },
          cacheHits: entry.cached ? { increment: 1 } : undefined,
          cacheMisses: entry.cached ? undefined : { increment: 1 },
        },
        create: {
          date: today,
          provider: entry.provider,
          model: entry.model,
          totalQueries: 1,
          totalTokens: entry.inputTokens + entry.outputTokens,
          totalCost: entry.totalCost,
          avgLatencyMs: entry.latencyMs,
          cacheHits: entry.cached ? 1 : 0,
          cacheMisses: entry.cached ? 0 : 1,
        },
      });
    } catch (error) {
      console.error('Failed to update daily metrics:', error);
    }
  }

  async getSessionHistory(sessionId: string, limit = 50): Promise<AuditEntry[]> {
    const records = await db.chatAuditLog.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return records.map((r) => ({
      userId: r.userId,
      sessionId: r.sessionId || '',
      query: r.query,
      queryHash: r.queryHash,
      intent: r.intent as QueryIntent | null,
      provider: r.provider as LLMProvider,
      model: r.model,
      templatesUsed: r.templatesUsed,
      entitiesAccessed: r.entitiesAccessed,
      branchesAccessed: r.branchesAccessed,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      totalCost: Number(r.totalCost),
      latencyMs: r.latencyMs,
      cached: r.cached,
      blocked: r.blocked,
      blockReason: r.blockReason || undefined,
    }));
  }

  async getUserStats(userId: string, days = 30): Promise<UserChatStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const records = await db.chatAuditLog.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
    });

    const totalQueries = records.length;
    const totalCost = records.reduce((sum, r) => sum + Number(r.totalCost), 0);
    const totalTokens = records.reduce(
      (sum, r) => sum + r.inputTokens + r.outputTokens,
      0
    );
    const avgLatency =
      totalQueries > 0
        ? records.reduce((sum, r) => sum + r.latencyMs, 0) / totalQueries
        : 0;
    const cacheHitRate =
      totalQueries > 0
        ? records.filter((r) => r.cached).length / totalQueries
        : 0;
    const blockedQueries = records.filter((r) => r.blocked).length;

    return {
      userId,
      period: `${days} days`,
      totalQueries,
      totalCost,
      totalTokens,
      avgLatency: Math.round(avgLatency),
      cacheHitRate: Math.round(cacheHitRate * 100),
      blockedQueries,
    };
  }

  async getDailyReport(date: Date): Promise<DailyReport> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const metrics = await db.chatMetric.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const byProvider: Record<string, ProviderMetrics> = {};

    for (const m of metrics) {
      const key = m.provider;
      if (!byProvider[key]) {
        byProvider[key] = {
          provider: m.provider,
          queries: 0,
          tokens: 0,
          cost: 0,
          avgLatency: 0,
          cacheHitRate: 0,
        };
      }
      byProvider[key].queries += m.totalQueries;
      byProvider[key].tokens += m.totalTokens;
      byProvider[key].cost += Number(m.totalCost);
    }

    const totalQueries = Object.values(byProvider).reduce(
      (sum, p) => sum + p.queries,
      0
    );
    const totalCost = Object.values(byProvider).reduce(
      (sum, p) => sum + p.cost,
      0
    );

    return {
      date: startOfDay,
      totalQueries,
      totalCost,
      byProvider: Object.values(byProvider),
    };
  }

  private hashQuery(query: string): string {
    return createHash('sha256').update(query.toLowerCase().trim()).digest('hex').slice(0, 16);
  }
}

interface UserChatStats {
  userId: string;
  period: string;
  totalQueries: number;
  totalCost: number;
  totalTokens: number;
  avgLatency: number;
  cacheHitRate: number;
  blockedQueries: number;
}

interface ProviderMetrics {
  provider: string;
  queries: number;
  tokens: number;
  cost: number;
  avgLatency: number;
  cacheHitRate: number;
}

interface DailyReport {
  date: Date;
  totalQueries: number;
  totalCost: number;
  byProvider: ProviderMetrics[];
}

export const chatAuditor = new ChatAuditor();
