import { Controller } from '@nestjs/common';

/**
 * Controller for advanced business metrics
 *
 * Standard Prometheus metrics are automatically exposed through the /metrics endpoint
 * configured in the PrometheusModule registration.
 */
@Controller()
export class MetricsController {}
