import { NodeSdk } from '@effect/opentelemetry';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

export const TracingLive = NodeSdk.layer(() => ({
  resource: {
    serviceName: 'librestock-api',
    attributes: {
      'deployment.environment': process.env.NODE_ENV,
    },
  },
  spanProcessor: new BatchSpanProcessor(
    new OTLPTraceExporter({
      url:
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
        'http://localhost:4318/v1/traces',
    }),
  ),
}));
