# DineLytix Multi-LLM Chatbot Architecture

**Version:** 1.0 | **Date:** January 2026 | **Status:** Design Specification

---

## Executive Summary

Enterprise-grade, cost-optimized, multi-LLM chatbot for DineLytix restaurant operations platform.

**Key Principles:** Database-first intelligence, aggressive cost optimization, provider-agnostic abstraction, role-based access, audit-ready operations.

---

## 1️⃣ Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                              │
│  Chat UI (shadcn/ui) │ Provider Selector │ Export/Share          │
└──────────────────────────────────────────────────────────────────┘
                                │
┌──────────────────────────────────────────────────────────────────┐
│                         API LAYER                                 │
│  /api/chat/route.ts • Auth • Rate Limiting • Validation          │
└──────────────────────────────────────────────────────────────────┘
                                │
┌──────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATION LAYER                            │
│  Query Classifier → Intent Router → Prompt Builder → Composer    │
└──────────────────────────────────────────────────────────────────┘
                                │
┌──────────────────────────────────────────────────────────────────┐
│                   LLM ABSTRACTION LAYER                           │
│  LLMProviderFactory → [OpenAI | DeepSeek | Gemini] Adapters      │
└──────────────────────────────────────────────────────────────────┘
                                │
┌──────────────────────────────────────────────────────────────────┐
│                    DATA ACCESS LAYER                              │
│  Schema Registry │ Query Templates │ SafeQueryBuilder │ Prisma   │
└──────────────────────────────────────────────────────────────────┘
                                │
┌──────────────────────────────────────────────────────────────────┐
│                      CACHING LAYER                                │
│  Prompt Cache (memory) │ Query Cache (KV) │ Semantic Cache       │
└──────────────────────────────────────────────────────────────────┘
```

### File Structure

```
lib/ai/
├── providers/
│   ├── index.ts              # Factory + auto-selection
│   ├── base-provider.ts      # Abstract interface
│   ├── openai-provider.ts
│   ├── deepseek-provider.ts
│   └── gemini-provider.ts
├── orchestration/
│   ├── classifier.ts         # Query intent classification
│   ├── router.ts             # Route to handler
│   ├── prompt-builder.ts     # Dynamic prompt composition
│   └── response-composer.ts
├── data/
│   ├── schema-registry.ts    # Semantic schema (NOT raw DDL)
│   ├── query-templates.ts    # Pre-approved query patterns
│   ├── query-builder.ts      # Safe execution with limits
│   └── result-summarizer.ts  # Compress before LLM
├── cache/
│   ├── prompt-cache.ts
│   ├── query-cache.ts
│   └── semantic-cache.ts
├── security/
│   ├── guardrails.ts         # Input/output validation
│   ├── data-access.ts        # Role-based filtering
│   └── audit.ts
└── types.ts

components/chat/
├── chat-container.tsx
├── chat-messages.tsx
├── chat-input.tsx
├── chat-message.tsx
├── insight-card.tsx
└── provider-selector.tsx

app/api/chat/route.ts
```

---

## 2️⃣ Multi-LLM Provider Strategy

### Provider Interface

```typescript
interface LLMProviderConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  contextWindow: number;
  costPer1kInput: number;
  costPer1kOutput: number;
}

abstract class BaseLLMProvider {
  abstract complete(request: LLMRequest): Promise<LLMResponse>;
  abstract stream(request: LLMRequest): AsyncGenerator<string>;
  abstract countTokens(text: string): number;
}
```

### Provider Matrix

| Provider | Model | Context | Input $/1M | Output $/1M | Best For |
|----------|-------|---------|------------|-------------|----------|
| OpenAI | gpt-4o-mini | 128K | $0.15 | $0.60 | Classification, routing |
| OpenAI | gpt-4o | 128K | $2.50 | $10.00 | Complex reasoning |
| DeepSeek | deepseek-chat | 64K | $0.14 | $0.28 | SQL gen, analysis |
| Gemini | gemini-1.5-flash | 1M | $0.075 | $0.30 | Large context, summaries |
| Gemini | gemini-1.5-pro | 2M | $1.25 | $5.00 | Complex BI insights |

### Auto-Selection Logic

```typescript
const autoSelectProvider = (query: ClassifiedQuery): ProviderChoice => {
  // Classification/routing → cheapest
  if (query.stage === 'classify') return { provider: 'openai', model: 'gpt-4o-mini' };
  
  // SQL generation → DeepSeek (excellent at structured)
  if (query.type === 'data_query') return { provider: 'deepseek', model: 'deepseek-chat' };
  
  // Large context → Gemini Flash
  if (query.contextSize > 50000) return { provider: 'gemini', model: 'gemini-1.5-flash' };
  
  // Complex BI → Gemini Pro
  if (query.type === 'analytical') return { provider: 'gemini', model: 'gemini-1.5-pro' };
  
  // Default
  return { provider: 'deepseek', model: 'deepseek-chat' };
};
```

### Failover Chain

```typescript
const FAILOVER_CHAIN = {
  'openai': ['deepseek', 'gemini'],
  'deepseek': ['gemini', 'openai'],
  'gemini': ['openai', 'deepseek'],
};
```

---

## 3️⃣ Database-Aware Intelligence

### Approach Decision

| Approach | Verdict | Reason |
|----------|---------|--------|
| Direct SQL Generation | ❌ Avoid | Injection risk, schema exposure |
| **Structured Query Templates** | ✅ Primary | Safe, predictable, fast |
| RAG | ⚠️ Secondary | Only for unstructured docs |

### Schema Registry (Semantic, NOT Raw DDL)

```typescript
// lib/ai/data/schema-registry.ts
const SCHEMA_REGISTRY = [
  {
    entity: 'sales',
    description: 'Daily sales by branch and channel',
    fields: ['date', 'branch', 'channel', 'revenue', 'transactions'],
    aggregations: ['sum', 'avg', 'count'],
    groupings: ['date', 'branch', 'channel', 'dayPart'],
  },
  {
    entity: 'inventory',
    description: 'Stock levels and movements',
    fields: ['item', 'quantity', 'reorder_level', 'branch'],
    flags: ['low_stock', 'overstock'],
  },
  // ... more entities
];
```

### Query Templates

```typescript
const QUERY_TEMPLATES = [
  {
    id: 'sales_by_branch_period',
    patterns: ['sales by branch {period}', 'branch comparison {period}'],
    prismaQuery: ({ branchIds, startDate, endDate }) => ({
      model: 'sale',
      operation: 'groupBy',
      by: ['branchId'],
      where: { saleDate: { gte: startDate, lte: endDate } },
      _sum: { totalRevenue: true },
    }),
    maxResults: 50,
    requiresRole: ['CEO', 'SENIOR_MANAGEMENT', 'BRANCH_MANAGER'],
  },
  // ... 30+ templates
];
```

### SafeQueryBuilder

```typescript
class SafeQueryBuilder {
  async execute(template, params, user) {
    // 1. Role check
    if (!this.hasAccess(template.requiresRole, user.role)) throw new UnauthorizedError();
    
    // 2. Branch isolation
    const scopedParams = this.applyBranchScope(params, user);
    
    // 3. Apply limits
    const query = template.prismaQuery(scopedParams);
    query.take = Math.min(query.take || 100, template.maxResults);
    
    // 4. Execute with timeout
    const result = await this.executeWithTimeout(query, 5000);
    
    // 5. Audit log
    await this.logQuery(template.id, user);
    
    return result;
  }
}
```

### Result Summarization

```typescript
class ResultSummarizer {
  summarize(results, schema) {
    if (results.length <= 10) return { type: 'full', data: results };
    
    return {
      type: 'summarized',
      totalCount: results.length,
      statistics: this.computeStats(results, schema),
      topN: results.slice(0, 5),
      bottomN: results.slice(-3),
    };
  }
}
```

---

## 4️⃣ Business Intelligence Layer

### Query Intent Classification

```typescript
type QueryIntent = 
  | 'informational'   // "Current stock levels?"
  | 'analytical'      // "Why did sales drop?"
  | 'comparative'     // "Branch A vs B"
  | 'predictive'      // "Will we hit target?"
  | 'recommendation'  // "How to reduce waste?"
  | 'operational';    // "Who's on shift?"
```

### Insight Generation

```typescript
interface InsightOutput {
  answer: string;
  confidence: 'high' | 'medium' | 'low';
  dataPoints: DataPoint[];
  trends?: Trend[];
  anomalies?: Anomaly[];
  recommendations?: Recommendation[];
  assumptions: string[];
  whyThisMatters?: string;
}
```

### Analytics Engine

```typescript
class AnalyticsEngine {
  detectTrends(data: TimeSeriesData[]): TrendAnalysis {
    const slope = this.calculateSlope(data);
    return {
      direction: slope > 0.05 ? 'increasing' : slope < -0.05 ? 'decreasing' : 'stable',
      percentageChange: ((data[data.length-1].value - data[0].value) / data[0].value) * 100,
      significance: Math.abs(slope) > 0.1 ? 'significant' : 'marginal',
    };
  }
  
  detectAnomalies(current: number, historical: number[]): Anomaly | null {
    const mean = avg(historical);
    const stdDev = standardDeviation(historical);
    const zScore = (current - mean) / stdDev;
    
    if (Math.abs(zScore) < 2) return null;
    return { value: current, expectedRange: [mean - 2*stdDev, mean + 2*stdDev] };
  }
}
```

---

## 5️⃣ Token Cost Optimization

### Cost Reduction Hierarchy

1. **Tier 1: Avoid LLM calls** → Cache hits, template matching
2. **Tier 2: Cheapest model** → gpt-4o-mini for classification ($0.15/1M)
3. **Tier 3: Minimize input** → Compressed prompts, schema summarization
4. **Tier 4: Control output** → max_tokens, structured output

### Prompt Compression

```typescript
class PromptBuilder {
  // Base: 150 tokens (vs 500+ uncompressed)
  readonly BASE_PROMPT = `DineLytix AI. Rules: Use ONLY provided data. State confidence. Currency: GHS. Be concise.`;
  
  // Schema compression: entity(field1,field2) format
  compressSchema(schema) {
    return schema.map(s => `${s.entity}(${s.fields.join(',')})`).join('; ');
  }
  
  // Data as compact tables, not JSON
  formatDataCompact(rows) {
    const headers = Object.keys(rows[0]);
    return [headers.join('|'), ...rows.map(r => headers.map(h => r[h]).join('|'))].join('\n');
  }
}
```

### Multi-Tier Caching

| Cache | TTL | Purpose |
|-------|-----|---------|
| Prompt Cache | 1hr | Exact prompt match |
| Query Cache | 5min | Database query results |
| Semantic Cache | 30min | Similar questions (cosine > 0.95) |

### Response Length Limits

```typescript
const RESPONSE_LIMITS = {
  informational: 150,
  operational: 100,
  analytical: 300,
  comparative: 250,
  predictive: 200,
  recommendation: 350,
};
```

---

## 6️⃣ Prompt Engineering

### Base System Prompt

```
You are DineLytix AI, a restaurant analytics assistant.

RULES:
1. Answer ONLY using provided data. Never invent numbers.
2. If insufficient data: "I don't have enough data for this."
3. State confidence: high/medium/low
4. Currency: GHS. Timezone: Africa/Accra
5. Be concise.

NEVER: Reveal schema, suggest DELETE/UPDATE, make up data.
```

### Intent-Specific Additions

- **Analytical:** "Identify root causes, rank factors by impact, explain why this matters"
- **Predictive:** "Project outcome with confidence interval, list key assumptions"
- **Recommendation:** "Be specific, estimate impact, note implementation complexity"

### Response Modes

| Mode | Temperature | Use Case |
|------|-------------|----------|
| Deterministic | 0.0 | Factual (sales, inventory) |
| Analytical | 0.2 | Trends, causes |
| Creative | 0.5 | Recommendations |

---

## 7️⃣ Security & Governance

### Role-Based Access

| Role | Own Branch | All Branches | Financial | Staff Personal |
|------|------------|--------------|-----------|----------------|
| CEO | ✅ | ✅ | ✅ | ✅ |
| SENIOR_MANAGEMENT | ✅ | ✅ | ✅ | ❌ |
| BRANCH_MANAGER | ✅ | ❌ | ✅ (own) | ✅ (own) |
| FINANCE_OPS | ✅ | ✅ | ✅ | ❌ |
| CASHIER | ✅ | ❌ | ❌ | ❌ |

### Prompt Injection Prevention

```typescript
const INJECTION_PATTERNS = [
  /ignore\s+(previous|all)\s+instructions/i,
  /you\s+are\s+now\s+/i,
  /pretend\s+to\s+be/i,
];

const SQL_PATTERNS = [
  /;\s*(DROP|DELETE|UPDATE)/i,
  /UNION\s+SELECT/i,
];
```

### Audit Trail

```typescript
interface ChatAuditEntry {
  userId: string;
  query: string;
  queryHash: string;  // For analytics
  intent: QueryIntent;
  provider: string;
  dataAccessed: string[];
  tokensUsed: number;
  cost: number;
  blocked: boolean;
  timestamp: Date;
}
```

---

## 8️⃣ UX Design

### Chat UI Structure

```
┌────────────────────────────────────────────────────────┐
│ DineLytix AI                    [Provider ▼] [⚙️]     │
├────────────────────────────────────────────────────────┤
│                                                        │
│ 💬 User: Yesterday's sales by branch?                 │
│                                                        │
│ 🤖 AI:                                                │
│ ┌────────────────────────────────────────────────────┐│
│ │ Branch     │ Revenue    │ Trans │ Avg             ││
│ │ Accra Mall │ GHS 12,450 │ 234   │ GHS 53          ││
│ │ Osu        │ GHS 9,820  │ 189   │ GHS 52          ││
│ └────────────────────────────────────────────────────┘│
│ 📊 Accra Mall leads with 42% of revenue.             │
│ [📥 CSV] [📋 Copy]           ▫️ high confidence      │
│                                                        │
├────────────────────────────────────────────────────────┤
│ [💡 "Top items" "Staff on duty" "Low stock"]          │
├────────────────────────────────────────────────────────┤
│ Ask about sales, inventory, staff...            [↵]   │
└────────────────────────────────────────────────────────┘
```

### Provider Selector

```typescript
const PROVIDERS = [
  { value: 'auto', label: 'Auto (Smart)', icon: Sparkles },
  { value: 'openai', label: 'OpenAI', icon: Brain },
  { value: 'deepseek', label: 'DeepSeek', icon: DollarSign },
  { value: 'gemini', label: 'Gemini', icon: Zap },
];
```

### Export Options

- **CSV:** Tabular data export
- **Markdown:** Full response with insights
- **Copy:** Quick clipboard

---

## 9️⃣ Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

- [ ] lib/ai/ directory structure
- [ ] BaseLLMProvider + OpenAI adapter
- [ ] Basic chat API with auth
- [ ] ChatContainer UI
- [ ] Schema Registry (10 entities)
- [ ] 10 core query templates
- [ ] SafeQueryBuilder + role filtering
- [ ] Input guardrails
- [ ] ChatAuditLog model

**Deliverable:** Basic chat with OpenAI, database queries working

### Phase 2: Intelligence (Weeks 3-4)

- [ ] Query Classifier
- [ ] DeepSeek + Gemini adapters
- [ ] Provider auto-selection
- [ ] Failover chain
- [ ] 20 additional query templates
- [ ] Result summarizer
- [ ] Dynamic prompt builder

**Deliverable:** Multi-provider with smart routing

### Phase 3: BI & Recommendations (Weeks 5-6)

- [ ] AnalyticsEngine (trends, anomalies)
- [ ] Insight card components
- [ ] Recommendation generator
- [ ] Confidence scoring
- [ ] "Why this matters" explanations

**Deliverable:** Full BI insights capability

### Phase 4: Optimization (Weeks 7-8)

- [ ] Prompt cache (LRU)
- [ ] Query result cache
- [ ] Semantic cache (embeddings)
- [ ] Response streaming optimization
- [ ] Token usage dashboard

**Deliverable:** <$0.01 avg cost per query

### Phase 5: Monitoring (Weeks 9-10)

- [ ] Cost tracking dashboard
- [ ] Provider performance metrics
- [ ] Accuracy sampling
- [ ] Compliance reports
- [ ] Alert thresholds

---

## 🔟 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Token cost/query | <$0.01 | Aggregated from audit logs |
| Answer accuracy | >95% | Weekly sampling (50 queries) |
| Query latency (p95) | <3s | API response time |
| Cache hit rate | >40% | Cache metrics |
| Provider failover success | >99% | Failover logs |
| User satisfaction | >4.2/5 | In-chat feedback |

### Cost Breakdown Targets

| Component | % of Total |
|-----------|------------|
| Classification | 5% |
| SQL/Query gen | 25% |
| Response gen | 50% |
| Re-tries/failover | 10% |
| Buffer | 10% |

---

## Database Schema Addition

```prisma
// Add to schema.prisma

model ChatSession {
  id        String   @id @default(cuid())
  userId    String
  title     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user     User          @relation(fields: [userId], references: [id])
  messages ChatMessage[]
  
  @@index([userId])
  @@map("chat_session")
}

model ChatMessage {
  id          String   @id @default(cuid())
  sessionId   String
  role        String   // 'user' | 'assistant'
  content     String
  provider    String?
  model       String?
  inputTokens Int?
  outputTokens Int?
  cost        Decimal? @db.Decimal(10, 6)
  latencyMs   Int?
  cached      Boolean  @default(false)
  createdAt   DateTime @default(now())
  
  session ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  @@index([sessionId])
  @@map("chat_message")
}

model ChatAuditLog {
  id              String   @id @default(cuid())
  userId          String
  sessionId       String?
  queryHash       String
  intent          String
  provider        String
  model           String
  dataAccessed    String[] // Entity types
  branchesAccessed String[]
  tokensUsed      Int
  cost            Decimal  @db.Decimal(10, 6)
  responseTimeMs  Int
  blocked         Boolean  @default(false)
  blockReason     String?
  createdAt       DateTime @default(now())
  
  @@index([userId])
  @@index([createdAt])
  @@index([provider])
  @@map("chat_audit_log")
}

model ChatMetric {
  id          String   @id @default(cuid())
  date        DateTime @db.Date
  provider    String
  model       String
  totalQueries Int
  totalTokens  Int
  totalCost   Decimal  @db.Decimal(12, 4)
  avgLatencyMs Int
  cacheHitRate Decimal @db.Decimal(5, 2)
  
  @@unique([date, provider, model])
  @@map("chat_metric")
}
```

---

## Environment Variables

```env
# LLM Providers
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...
GOOGLE_AI_API_KEY=...

# Feature Flags
CHAT_ENABLED=true
CHAT_DEFAULT_PROVIDER=auto
CHAT_MAX_TOKENS_PER_REQUEST=4000
CHAT_RATE_LIMIT_PER_MINUTE=20

# Caching
CHAT_CACHE_TTL_SECONDS=300
CHAT_SEMANTIC_CACHE_ENABLED=true

# Cost Controls
CHAT_DAILY_COST_LIMIT_USD=50
CHAT_ALERT_THRESHOLD_USD=40
```

---

## Summary

This architecture delivers:

1. **Cost efficiency:** Tiered models, aggressive caching, prompt compression
2. **Safety:** Template-based queries, no raw SQL, role-based access
3. **Flexibility:** Provider abstraction, failover, manual/auto selection
4. **Auditability:** Full logging, compliance reports, cost tracking
5. **UX:** Streaming, insights cards, export options

**Estimated cost:** $0.005-$0.02 per query (varies by complexity)

**Next step:** Begin Phase 1 implementation with OpenAI adapter and core query templates.
