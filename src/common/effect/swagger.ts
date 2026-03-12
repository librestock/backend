import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiQuery } from '@nestjs/swagger';
import { JSONSchema, Schema } from 'effect';

type JsonSchemaObj = Record<string, unknown>;

/**
 * Resolve all $ref pointers in a JSON Schema by inlining the $defs.
 *
 * Effect's JSONSchema.make() produces a schema with $defs and $ref pointers.
 * OpenAPI / NestJS Swagger expects a flat, self-contained schema object.
 */
function resolveRefs(
  node: unknown,
  defs: Record<string, JsonSchemaObj>,
): unknown {
  if (node === null || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map((item) => resolveRefs(item, defs));

  const obj = node as JsonSchemaObj;

  // Resolve $ref pointers
  if (typeof obj['$ref'] === 'string') {
    const refPath = obj['$ref'] as string;
    const defName = refPath.replace('#/$defs/', '');
    const resolved = defs[defName];
    if (resolved) {
      return resolveRefs(resolved, defs);
    }
    return obj;
  }

  // Recurse into all properties
  const result: JsonSchemaObj = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === '$defs' || key === '$schema') continue;
    result[key] = resolveRefs(value, defs);
  }
  return result;
}

/**
 * Convert an Effect Schema to an OpenAPI-compatible JSON Schema object.
 *
 * Strips $schema and $defs, inlines all $ref pointers, producing a flat
 * schema suitable for NestJS Swagger's @ApiBody({ schema }) or
 * @ApiQuery({ schema }) decorators.
 */
export function effectSchemaToOpenApi<A, I, R>(
  schema: Schema.Schema<A, I, R>,
): JsonSchemaObj {
  const jsonSchema: JsonSchemaObj = JSON.parse(
    JSON.stringify(JSONSchema.make(schema)),
  );
  const defs = (jsonSchema['$defs'] as Record<string, JsonSchemaObj>) ?? {};
  return resolveRefs(jsonSchema, defs) as JsonSchemaObj;
}

/**
 * Decorator that generates @ApiBody from an Effect Schema.
 *
 * Usage:
 *   @Post()
 *   @ApiEffectBody(CreateOrderSchema)
 *   create(@Body(new EffectPipe(CreateOrderSchema)) dto: CreateOrder) { ... }
 */
export function ApiEffectBody<A, I, R>(
  schema: Schema.Schema<A, I, R>,
): MethodDecorator {
  return applyDecorators(
    ApiBody({ schema: effectSchemaToOpenApi(schema) }),
  );
}

/**
 * Decorator that generates @ApiQuery entries from an Effect Schema.Struct.
 *
 * Each field in the struct becomes a separate query parameter.
 *
 * Usage:
 *   @Get()
 *   @ApiEffectQuery(OrderQuerySchema)
 *   list(@Query(new EffectPipe(OrderQuerySchema)) query: OrderQuery) { ... }
 */
export function ApiEffectQuery<A, I, R>(
  schema: Schema.Schema<A, I, R>,
): MethodDecorator {
  const openApi = effectSchemaToOpenApi(schema);
  const properties = (openApi['properties'] ?? {}) as Record<
    string,
    JsonSchemaObj
  >;
  const required = new Set(
    (openApi['required'] as string[] | undefined) ?? [],
  );

  const decorators = Object.entries(properties).map(([name, propSchema]) =>
    ApiQuery({
      name,
      required: required.has(name),
      schema: propSchema,
    }),
  );

  return applyDecorators(...decorators);
}
