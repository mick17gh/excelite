import { Role } from '@/lib/generated/prisma/client';

// ============================================
// LLM Provider Types
// ============================================

export type LLMProvider = 'openai' | 'deepseek' | 'gemini';
export type SelectionMode = 'manual' | 'auto-cost' | 'auto-quality' | 'auto-balanced';

export interface LLMProviderConfig {
  name: LLMProvider;
  apiKey: string;
  model: string;
  maxTokens: number;
  contextWindow: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  supportsStreaming: boolean;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stream?: boolean;
  responseFormat?: 'text' | 'json';
}

export interface LLMResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
  };
  provider: LLMProvider;
  model: string;
  latencyMs: number;
  cached: boolean;
}

export interface LLMStreamChunk {
  content: string;
  done: boolean;
}

// ============================================
// Query Classification Types
// ============================================

export type QueryIntent =
  | 'informational'   // "What are current stock levels?"
  | 'analytical'      // "Why did sales drop last week?"
  | 'comparative'     // "Compare branch A vs B"
  | 'predictive'      // "Will we hit this month's target?"
  | 'recommendation'  // "How can we reduce waste?"
  | 'operational';    // "Who's on shift tomorrow?"

export type QueryComplexity = 'simple' | 'moderate' | 'complex';

export interface ExtractedEntity {
  type: 'branch' | 'menu_item' | 'staff' | 'inventory' | 'category' | 'supplier' | 'date' | 'metric';
  value: string;
  normalized?: string;
}

export interface TimeRange {
  type: 'relative' | 'absolute';
  value: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ClassifiedQuery {
  originalQuery: string;
  intent: QueryIntent;
  entities: ExtractedEntity[];
  timeRange: TimeRange | null;
  branches: string[] | 'all';
  complexity: QueryComplexity;
  confidence: number;
  suggestedTemplates: string[];
}

// ============================================
// Schema Registry Types
// ============================================

export type FieldType = 'string' | 'number' | 'decimal' | 'currency' | 'date' | 'datetime' | 'boolean' | 'enum' | 'reference' | 'count';

export interface SchemaField {
  name: string;
  type: FieldType;
  description: string;
  enumValues?: string[];
  referenceTo?: string;
  sensitive?: boolean;
}

export interface SchemaEntity {
  entity: string;
  description: string;
  fields: SchemaField[];
  allowedAggregations: ('sum' | 'avg' | 'count' | 'min' | 'max')[];
  allowedGroupings: string[];
  timeRanges?: string[];
  requiredRole: Role[];
}

// ============================================
// Query Template Types
// ============================================

export interface QueryParams {
  branchId?: string;
  branchIds?: string[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  category?: string;
  channel?: string;
  staffRole?: string;
  itemId?: string;
  [key: string]: unknown;
}

export interface QueryTemplate {
  id: string;
  intent: QueryIntent;
  entity: string;
  patterns: string[];
  description: string;
  buildQuery: (params: QueryParams) => PrismaQueryConfig;
  maxResults: number;
  requiredRoles: Role[];
  cacheTTL: number; // seconds
}

export interface PrismaQueryConfig {
  model: string;
  operation: 'findMany' | 'findFirst' | 'aggregate' | 'groupBy' | 'count';
  where?: Record<string, unknown>;
  select?: Record<string, boolean | Record<string, unknown>>;
  include?: Record<string, boolean | Record<string, unknown>>;
  orderBy?: unknown; // Prisma orderBy can be complex (nested, arrays, _sum, etc.)
  take?: number;
  skip?: number;
  _sum?: Record<string, boolean>;
  _avg?: Record<string, boolean>;
  _count?: Record<string, boolean> | boolean;
  _min?: Record<string, boolean>;
  _max?: Record<string, boolean>;
  by?: string[];
}

// ============================================
// Query Execution Types
// ============================================

export interface QueryResult {
  success: boolean;
  data: unknown[];
  count: number;
  truncated: boolean;
  executionTimeMs: number;
  templateId: string;
  cached: boolean;
}

export interface SummarizedResult {
  type: 'full' | 'summarized';
  totalCount: number;
  data?: unknown[];
  statistics?: Record<string, { min: number; max: number; avg: number; sum: number }>;
  topN?: unknown[];
  bottomN?: unknown[];
}

// ============================================
// Insight Types
// ============================================

export interface DataPoint {
  label: string;
  value: number | string;
  change?: number;
  changeDirection?: 'up' | 'down' | 'stable';
}

export interface Trend {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  percentageChange: number;
  period: string;
  significance: 'significant' | 'marginal' | 'noise';
}

export interface Anomaly {
  metric: string;
  value: number;
  expectedRange: [number, number];
  deviationPercent: number;
  severity: 'low' | 'medium' | 'high';
}

export interface Recommendation {
  action: string;
  rationale: string;
  expectedImpact: string;
  effort: 'low' | 'medium' | 'high';
  priority: number;
}

export interface InsightOutput {
  answer: string;
  confidence: 'high' | 'medium' | 'low';
  dataPoints: DataPoint[];
  trends?: Trend[];
  anomalies?: Anomaly[];
  recommendations?: Recommendation[];
  assumptions: string[];
  whyThisMatters?: string;
}

// ============================================
// Chat Types
// ============================================

export interface ChatContext {
  userId: string;
  userRole: Role;
  branchId: string | null;
  sessionId: string;
  previousMessages: LLMMessage[];
}

export interface ChatRequest {
  message: string;
  context: ChatContext;
  provider?: LLMProvider;
  selectionMode?: SelectionMode;
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  insight?: InsightOutput;
  queryResults?: SummarizedResult;
  provider: LLMProvider;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
  latencyMs: number;
  cached: boolean;
  templateUsed?: string;
}

// ============================================
// Security Types
// ============================================

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  blocked: boolean;
  sanitizedInput?: string;
}

export interface AuditEntry {
  userId: string;
  sessionId: string;
  query: string;
  queryHash: string;
  intent: QueryIntent | null;
  provider: LLMProvider;
  model: string;
  templatesUsed: string[];
  entitiesAccessed: string[];
  branchesAccessed: string[];
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  latencyMs: number;
  cached: boolean;
  blocked: boolean;
  blockReason?: string;
}

// ============================================
// Cache Types
// ============================================

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  oldestEntry: number;
}
