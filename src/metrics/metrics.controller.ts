import { Controller } from '@nestjs/common';

/**
 * Controller for advanced business metrics
 *
 * Note: This controller is currently empty because the standard Prometheus metrics
 * are already automatically exposed through the /metrics endpoint configured in the
 * PrometheusModule registration (metrics.module.ts).
 *
 * This controller should be used for implementing advanced business-specific metrics
 * that require custom processing or presentation beyond the standard Prometheus format,
 * such as:
 * - Aggregated business KPIs
 * - Pre-calculated ratios and trends
 * - Custom JSON-formatted metrics for business dashboards
 * - Metrics that require complex database queries or processing
 */
@Controller()
export class MetricsController {}
