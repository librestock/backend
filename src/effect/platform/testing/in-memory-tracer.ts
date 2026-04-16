import { Layer, Tracer } from 'effect';

export interface RecordedSpan {
  name: string;
  attributes: Map<string, unknown>;
  status: Tracer.SpanStatus;
}

export interface InMemoryTracer {
  readonly spans: ReadonlyArray<RecordedSpan>;
  reset(): void;
  findSpan(name: string): RecordedSpan | undefined;
}

export const makeInMemoryTracer = (): {
  tracer: Tracer.Tracer;
  recorder: InMemoryTracer;
} => {
  const spans: RecordedSpan[] = [];

  const tracer = Tracer.make({
    span(name, parent, context, links, startTime, kind, options) {
      const attributes = new Map<string, unknown>(
        Object.entries(options?.attributes ?? {}),
      );
      const record: RecordedSpan = {
        name,
        attributes,
        status: { _tag: 'Started', startTime },
      };
      spans.push(record);

      const span: Tracer.Span = {
        _tag: 'Span',
        name,
        spanId: `span-${spans.length}`,
        traceId: 'trace-in-memory',
        parent,
        context,
        get status() {
          return record.status;
        },
        get attributes() {
          return attributes;
        },
        links,
        sampled: true,
        kind,
        end(endTime, exit) {
          record.status = { _tag: 'Ended', startTime, endTime, exit };
        },
        attribute(key, value) {
          attributes.set(key, value);
        },
        event() {},
        addLinks() {},
      };

      return span;
    },
    context(f) {
      return f();
    },
  });

  const recorder: InMemoryTracer = {
    get spans() {
      return spans;
    },
    reset() {
      spans.length = 0;
    },
    findSpan(name) {
      return spans.find((span) => span.name === name);
    },
  };

  return { tracer, recorder };
};

export const inMemoryTracerLayer = (tracer: Tracer.Tracer) =>
  Layer.succeed(Tracer.Tracer, tracer);
