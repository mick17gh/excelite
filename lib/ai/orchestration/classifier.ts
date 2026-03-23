import type { ClassifiedQuery, QueryIntent, ExtractedEntity, TimeRange, QueryComplexity } from '../types';
import { findMatchingTemplates } from '../data/query-templates';

const INTENT_KEYWORDS: Record<QueryIntent, string[]> = {
  informational: [
    'what',
    'how much',
    'how many',
    'current',
    'show',
    'list',
    'get',
    'tell me',
    'report',
    'export',
    'warehouse',
    'where',
  ],
  analytical: ['why', 'analyze', 'explain', 'cause', 'reason', 'because', 'trend', 'pattern'],
  comparative: ['compare', 'versus', 'vs', 'difference', 'between', 'better', 'worse', 'ranking'],
  predictive: ['predict', 'forecast', 'will', 'expect', 'projection', 'estimate', 'future'],
  recommendation: ['recommend', 'suggest', 'should', 'improve', 'optimize', 'advice', 'best way'],
  operational: ['who', 'schedule', 'shift', 'duty', 'on duty', 'working', 'today', 'alert', 'issue'],
};

const TIME_PATTERNS: Record<string, { type: 'relative'; value: string }> = {
  'today': { type: 'relative', value: 'today' },
  'yesterday': { type: 'relative', value: 'yesterday' },
  'this week': { type: 'relative', value: 'this_week' },
  'last week': { type: 'relative', value: 'last_week' },
  'this month': { type: 'relative', value: 'this_month' },
  'last month': { type: 'relative', value: 'last_month' },
  'this year': { type: 'relative', value: 'this_year' },
  'last 7 days': { type: 'relative', value: 'last_7_days' },
  'last 30 days': { type: 'relative', value: 'last_30_days' },
  'past week': { type: 'relative', value: 'last_week' },
  'past month': { type: 'relative', value: 'last_month' },
};

const ENTITY_PATTERNS: Record<string, RegExp[]> = {
  branch: [
    /branch\s+(\w+)/i,
    /(\w+)\s+branch/i,
    /at\s+(\w+)/i,
    /in\s+(\w+)\s+(?:branch|location)/i,
  ],
  menu_item: [
    /item\s+["']?([^"']+)["']?/i,
    /["']([^"']+)["']\s+(?:dish|food|item)/i,
  ],
  category: [
    /category\s+["']?([^"']+)["']?/i,
    /(\w+)\s+category/i,
  ],
  metric: [
    /(sales|revenue|profit|waste|inventory|stock|transactions?|orders?|warehouse|hub|transfer|report|customer|pos|delivery)/i,
  ],
};

export class QueryClassifier {
  classify(query: string): ClassifiedQuery {
    const normalizedQuery = query.toLowerCase().trim();

    // Detect intent
    const intent = this.detectIntent(normalizedQuery);

    // Extract entities
    const entities = this.extractEntities(normalizedQuery);

    // Extract time range
    const timeRange = this.extractTimeRange(normalizedQuery);

    // Detect complexity
    const complexity = this.assessComplexity(normalizedQuery, intent, entities);

    // Find matching templates
    const matchingTemplates = findMatchingTemplates(query);
    const suggestedTemplates = matchingTemplates.map((t) => t.id);

    // Calculate confidence
    const confidence = this.calculateConfidence(
      intent,
      entities,
      timeRange,
      suggestedTemplates.length
    );

    return {
      originalQuery: query,
      intent,
      entities,
      timeRange,
      branches: this.extractBranches(entities),
      complexity,
      confidence,
      suggestedTemplates,
    };
  }

  private detectIntent(query: string): QueryIntent {
    const scores: Record<QueryIntent, number> = {
      informational: 0,
      analytical: 0,
      comparative: 0,
      predictive: 0,
      recommendation: 0,
      operational: 0,
    };

    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
      for (const keyword of keywords) {
        if (query.includes(keyword)) {
          scores[intent as QueryIntent] += 1;
        }
      }
    }

    // Find highest scoring intent
    let maxScore = 0;
    let detectedIntent: QueryIntent = 'informational';

    for (const [intent, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedIntent = intent as QueryIntent;
      }
    }

    return detectedIntent;
  }

  private extractEntities(query: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    for (const [type, patterns] of Object.entries(ENTITY_PATTERNS)) {
      for (const pattern of patterns) {
        const match = query.match(pattern);
        if (match && match[1]) {
          entities.push({
            type: type as ExtractedEntity['type'],
            value: match[1].trim(),
          });
        }
      }
    }

    return entities;
  }

  private extractTimeRange(query: string): TimeRange | null {
    for (const [phrase, range] of Object.entries(TIME_PATTERNS)) {
      if (query.includes(phrase)) {
        return range;
      }
    }

    // Check for date patterns (YYYY-MM-DD)
    const dateMatch = query.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      return {
        type: 'absolute',
        value: dateMatch[1],
        startDate: new Date(dateMatch[1]),
        endDate: new Date(dateMatch[1]),
      };
    }

    return null;
  }

  private assessComplexity(
    query: string,
    intent: QueryIntent,
    entities: ExtractedEntity[]
  ): QueryComplexity {
    let score = 0;

    // Query length factor
    if (query.length > 100) score += 1;
    if (query.length > 200) score += 1;

    // Intent complexity
    if (['analytical', 'predictive', 'recommendation'].includes(intent)) {
      score += 1;
    }

    // Multiple entities
    if (entities.length > 2) score += 1;

    // Multiple clauses (and, or, but)
    const clauseCount = (query.match(/\b(and|or|but|also|then)\b/gi) || []).length;
    if (clauseCount > 1) score += 1;

    if (score <= 1) return 'simple';
    if (score <= 3) return 'moderate';
    return 'complex';
  }

  private extractBranches(entities: ExtractedEntity[]): string[] | 'all' {
    const branchEntities = entities.filter((e) => e.type === 'branch');
    if (branchEntities.length === 0) return 'all';
    return branchEntities.map((e) => e.value);
  }

  private calculateConfidence(
    intent: QueryIntent,
    entities: ExtractedEntity[],
    timeRange: TimeRange | null,
    templateMatches: number
  ): number {
    let confidence = 0.5;

    // Template matches boost confidence significantly
    if (templateMatches > 0) confidence += 0.3;
    if (templateMatches > 1) confidence += 0.1;

    // Clear entities boost confidence
    if (entities.length > 0) confidence += 0.1;

    // Time range specified
    if (timeRange) confidence += 0.05;

    // Cap at 0.95
    return Math.min(confidence, 0.95);
  }
}

export const queryClassifier = new QueryClassifier();
