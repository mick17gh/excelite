import { Role } from '@/lib/generated/prisma/client';
import { db } from '@/lib/db';
import { createHash } from 'crypto';
import type { QueryTemplate, QueryParams, QueryResult, PrismaQueryConfig } from '../types';
import { QUERY_TEMPLATES, getTemplateById } from './query-templates';

const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 10,
  ADMIN: 9,
  EXECUTIVE: 8,
  OPERATIONS_MANAGER: 7,
  BRANCH_MANAGER: 6,
  SUPERVISOR: 5,
  STAFF: 4,
  WAITER: 4,
  KITCHEN_STAFF: 3,
  AUDITOR: 3,
  DEVELOPER: 2,
  CALL_CENTER: 2,
  WAREHOUSE_STAFF: 2,
  COMMISSARY_STAFF: 2,
};

const GLOBAL_ACCESS_ROLES: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.EXECUTIVE, Role.OPERATIONS_MANAGER, Role.AUDITOR];

interface UserContext {
  userId: string;
  role: Role;
  branchId: string | null;
}

interface QueryExecutionOptions {
  timeout?: number;
  skipCache?: boolean;
}

export class SafeQueryBuilder {
  private readonly MAX_RESULTS = 100;
  private readonly DEFAULT_TIMEOUT = 5000;
  private queryCache: Map<string, { result: QueryResult; timestamp: number }> = new Map();

  async execute(
    templateId: string,
    params: QueryParams,
    user: UserContext,
    options: QueryExecutionOptions = {}
  ): Promise<QueryResult> {
    const startTime = Date.now();
    const template = getTemplateById(templateId);

    if (!template) {
      throw new QueryBuilderError(`Template not found: ${templateId}`, 'TEMPLATE_NOT_FOUND');
    }

    // 1. Role-based access check
    if (!this.hasAccess(template.requiredRoles, user.role)) {
      throw new QueryBuilderError(
        `Unauthorized: Role ${user.role} cannot access ${templateId}`,
        'UNAUTHORIZED'
      );
    }

    // 2. Apply branch scope
    const scopedParams = this.applyBranchScope(params, user);

    // 3. Check cache
    const cacheKey = this.generateCacheKey(templateId, scopedParams, user);
    if (!options.skipCache) {
      const cached = this.getFromCache(cacheKey, template.cacheTTL);
      if (cached) {
        return { ...cached, cached: true };
      }
    }

    // 4. Build query with limits
    const queryConfig = template.buildQuery(scopedParams);
    const limitedConfig = this.applyLimits(queryConfig, template.maxResults);

    // 5. Execute with timeout
    const result = await this.executeWithTimeout(
      limitedConfig,
      options.timeout || this.DEFAULT_TIMEOUT
    );

    const queryResult: QueryResult = {
      success: true,
      data: Array.isArray(result) ? result : [result],
      count: Array.isArray(result) ? result.length : 1,
      truncated: Array.isArray(result) && result.length >= (limitedConfig.take || this.MAX_RESULTS),
      executionTimeMs: Date.now() - startTime,
      templateId,
      cached: false,
    };

    // 6. Cache result
    this.setCache(cacheKey, queryResult, template.cacheTTL);

    return queryResult;
  }

  async executeMultiple(
    templateIds: string[],
    params: QueryParams,
    user: UserContext
  ): Promise<Map<string, QueryResult>> {
    const results = new Map<string, QueryResult>();

    await Promise.all(
      templateIds.map(async (templateId) => {
        try {
          const result = await this.execute(templateId, params, user);
          results.set(templateId, result);
        } catch (error) {
          results.set(templateId, {
            success: false,
            data: [],
            count: 0,
            truncated: false,
            executionTimeMs: 0,
            templateId,
            cached: false,
          });
        }
      })
    );

    return results;
  }

  private hasAccess(requiredRoles: Role[], userRole: Role): boolean {
    return requiredRoles.includes(userRole);
  }

  private applyBranchScope(params: QueryParams, user: UserContext): QueryParams {
    // Global access roles can see all branches
    if (GLOBAL_ACCESS_ROLES.includes(user.role)) {
      return params;
    }

    // Branch-scoped roles can only see their branch
    if (!user.branchId) {
      throw new QueryBuilderError(
        'User has no assigned branch',
        'NO_BRANCH_ASSIGNED'
      );
    }

    return {
      ...params,
      branchId: user.branchId,
      branchIds: undefined, // Remove any multi-branch params
    };
  }

  private applyLimits(config: PrismaQueryConfig, templateMax: number): PrismaQueryConfig {
    const effectiveLimit = Math.min(
      config.take || this.MAX_RESULTS,
      templateMax,
      this.MAX_RESULTS
    );

    return {
      ...config,
      take: effectiveLimit,
    };
  }

  private async executeWithTimeout(
    config: PrismaQueryConfig,
    timeout: number
  ): Promise<unknown> {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new QueryBuilderError('Query timeout', 'TIMEOUT')), timeout);
    });

    const queryPromise = this.executePrismaQuery(config);

    return Promise.race([queryPromise, timeoutPromise]);
  }

  private async executePrismaQuery(config: PrismaQueryConfig): Promise<unknown> {
    const model = (db as unknown as Record<string, unknown>)[config.model];
    
    if (!model || typeof model !== 'object') {
      throw new QueryBuilderError(`Invalid model: ${config.model}`, 'INVALID_MODEL');
    }

    const operation = (model as Record<string, unknown>)[config.operation];
    
    if (typeof operation !== 'function') {
      throw new QueryBuilderError(
        `Invalid operation: ${config.operation}`,
        'INVALID_OPERATION'
      );
    }

    const queryArgs: Record<string, unknown> = {};

    if (config.where) queryArgs.where = config.where;
    if (config.select) queryArgs.select = config.select;
    if (config.include) queryArgs.include = config.include;
    if (config.orderBy) queryArgs.orderBy = config.orderBy;
    if (config.take) queryArgs.take = config.take;
    if (config.skip) queryArgs.skip = config.skip;

    // Aggregation-specific args
    if (config.operation === 'aggregate') {
      if (config._sum) queryArgs._sum = config._sum;
      if (config._avg) queryArgs._avg = config._avg;
      if (config._count) queryArgs._count = config._count;
      if (config._min) queryArgs._min = config._min;
      if (config._max) queryArgs._max = config._max;
    }

    // GroupBy-specific args
    if (config.operation === 'groupBy') {
      if (config.by) queryArgs.by = config.by;
      if (config._sum) queryArgs._sum = config._sum;
      if (config._avg) queryArgs._avg = config._avg;
      if (config._count) queryArgs._count = config._count;
      if (config._min) queryArgs._min = config._min;
      if (config._max) queryArgs._max = config._max;
    }

    return operation.call(model, queryArgs);
  }

  private generateCacheKey(
    templateId: string,
    params: QueryParams,
    user: UserContext
  ): string {
    const keyData = JSON.stringify({
      templateId,
      params,
      branchId: user.branchId,
      role: user.role,
    });
    return createHash('sha256').update(keyData).digest('hex').slice(0, 16);
  }

  private getFromCache(key: string, ttl: number): QueryResult | null {
    const cached = this.queryCache.get(key);
    if (!cached) return null;

    const age = (Date.now() - cached.timestamp) / 1000;
    if (age > ttl) {
      this.queryCache.delete(key);
      return null;
    }

    return cached.result;
  }

  private setCache(key: string, result: QueryResult, ttl: number): void {
    // Limit cache size
    if (this.queryCache.size > 1000) {
      const oldestKey = this.queryCache.keys().next().value;
      if (oldestKey) this.queryCache.delete(oldestKey);
    }

    this.queryCache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  clearCache(): void {
    this.queryCache.clear();
  }

  getAvailableTemplates(role: Role): QueryTemplate[] {
    return QUERY_TEMPLATES.filter((t) => t.requiredRoles.includes(role));
  }
}

export class QueryBuilderError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'QueryBuilderError';
  }
}

export const queryBuilder = new SafeQueryBuilder();
