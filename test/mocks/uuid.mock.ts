const FALLBACK_UUID = '00000000-0000-4000-8000-000000000000';

export function v4(): string {
  return FALLBACK_UUID;
}

export function validate(value: string): boolean {
  return /^[\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(
    value,
  );
}
