import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

// Enable diagnostics for debugging (optional)
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

export function initTracing() {
  try {
    console.log('Initializing the tracing system...');

    // Configure the OTLP exporter to send traces to Tempo
    const traceExporter = new OTLPTraceExporter({
      url:
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
        'http://localhost:4318/v1/traces',
    });

    // Configure the SDK using the modern approach
    const sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]:
          process.env.OTEL_SERVICE_NAME || 'nest-app',
      }),
      traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-http': { enabled: true },
          '@opentelemetry/instrumentation-express': { enabled: true },
          '@opentelemetry/instrumentation-nestjs-core': { enabled: true },
          '@opentelemetry/instrumentation-pg': { enabled: true },
          '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
      ],
    });

    // Start the SDK
    sdk.start();

    console.log('Tracing system initialized successfully');

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('Shutting down the tracing system...');
      sdk
        .shutdown()
        .then(() => console.log('Tracing terminated successfully'))
        .catch((err) => console.error('Error shutting down tracing', err))
        .finally(() => process.exit(0));
    });

    return true;
  } catch (error) {
    console.error('Error initializing the tracing system:', error);
    return false;
  }
}

export default initTracing;
