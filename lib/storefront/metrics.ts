type MetricName =
  | "storefront.config.requests"
  | "storefront.menu.requests"
  | "storefront.branches.requests"
  | "storefront.orders.created"
  | "storefront.orders.failed"
  | "storefront.payments.verified";

export function recordStorefrontMetric(name: MetricName, context: Record<string, unknown>) {
  // Lightweight hook for now; can be replaced with DataDog/OpenTelemetry exporter.
  console.info("[storefront-metric]", name, JSON.stringify(context));
}
