import type { SummarizedResult, SchemaEntity } from '../types';

interface SummaryStatistics {
  [field: string]: {
    min: number;
    max: number;
    avg: number;
    sum: number;
  };
}

export class ResultSummarizer {
  private readonly FULL_RESULT_THRESHOLD = 10;
  private readonly TOP_N = 5;
  private readonly BOTTOM_N = 3;

  summarize(results: unknown[], schema?: SchemaEntity): SummarizedResult {
    if (!Array.isArray(results) || results.length === 0) {
      return { type: 'full', totalCount: 0, data: [] };
    }

    if (results.length <= this.FULL_RESULT_THRESHOLD) {
      return { type: 'full', totalCount: results.length, data: results };
    }

    const numericFields = this.detectNumericFields(results[0]);
    const statistics = this.computeStatistics(results, numericFields);

    return {
      type: 'summarized',
      totalCount: results.length,
      statistics,
      topN: results.slice(0, this.TOP_N),
      bottomN: results.slice(-this.BOTTOM_N),
    };
  }

  formatForPrompt(result: SummarizedResult): string {
    if (result.type === 'full' && result.data) {
      return this.formatAsCompactTable(result.data);
    }

    const parts: string[] = [];
    parts.push(`Total records: ${result.totalCount}`);

    if (result.statistics && Object.keys(result.statistics).length > 0) {
      parts.push('\nStatistics:');
      for (const [field, stats] of Object.entries(result.statistics)) {
        parts.push(`  ${field}: min=${this.formatNumber(stats.min)}, max=${this.formatNumber(stats.max)}, avg=${this.formatNumber(stats.avg)}, sum=${this.formatNumber(stats.sum)}`);
      }
    }

    if (result.topN && result.topN.length > 0) {
      parts.push(`\nTop ${result.topN.length}:`);
      parts.push(this.formatAsCompactTable(result.topN));
    }

    if (result.bottomN && result.bottomN.length > 0) {
      parts.push(`\nBottom ${result.bottomN.length}:`);
      parts.push(this.formatAsCompactTable(result.bottomN));
    }

    return parts.join('\n');
  }

  formatAsCompactTable(rows: unknown[]): string {
    if (!rows.length) return '(no data)';

    const firstRow = rows[0] as Record<string, unknown>;
    const headers = Object.keys(firstRow).filter(
      (key) => !this.isComplexObject(firstRow[key])
    );

    if (headers.length === 0) return '(complex data)';

    const headerRow = headers.join(' | ');
    const separator = headers.map(() => '---').join(' | ');
    const dataRows = rows.map((row) => {
      const r = row as Record<string, unknown>;
      return headers.map((h) => this.formatValue(r[h])).join(' | ');
    });

    return [headerRow, separator, ...dataRows].join('\n');
  }

  private detectNumericFields(sample: unknown): string[] {
    if (!sample || typeof sample !== 'object') return [];

    const obj = sample as Record<string, unknown>;
    return Object.keys(obj).filter((key) => {
      const value = obj[key];
      return typeof value === 'number' || this.isDecimal(value);
    });
  }

  private computeStatistics(
    results: unknown[],
    numericFields: string[]
  ): SummaryStatistics {
    const stats: SummaryStatistics = {};

    for (const field of numericFields) {
      const values = results
        .map((r) => {
          const val = (r as Record<string, unknown>)[field];
          return this.toNumber(val);
        })
        .filter((v) => v !== null) as number[];

      if (values.length > 0) {
        stats[field] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          sum: values.reduce((a, b) => a + b, 0),
        };
      }
    }

    return stats;
  }

  private isDecimal(value: unknown): boolean {
    if (!value) return false;
    if (typeof value === 'object' && 'toNumber' in (value as object)) {
      return true;
    }
    return false;
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number') return value;
    if (this.isDecimal(value)) {
      return (value as { toNumber: () => number }).toNumber();
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') return this.formatNumber(value);
    if (this.isDecimal(value)) {
      return this.formatNumber((value as { toNumber: () => number }).toNumber());
    }
    if (value instanceof Date) return value.toISOString().split('T')[0];
    if (typeof value === 'object') {
      // Handle nested objects (like branch: { name: 'X' })
      const obj = value as Record<string, unknown>;
      if ('name' in obj) return String(obj.name);
      if ('code' in obj) return String(obj.code);
      return '[object]';
    }
    return String(value);
  }

  private formatNumber(value: number): string {
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private isComplexObject(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return true;
    if (typeof value === 'object') {
      // Allow simple nested objects with name/code
      const obj = value as Record<string, unknown>;
      if ('name' in obj || 'code' in obj) return false;
      return true;
    }
    return false;
  }
}

export const resultSummarizer = new ResultSummarizer();
