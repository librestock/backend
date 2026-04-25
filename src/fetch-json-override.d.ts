// undici-types defines Response.json() as Promise<unknown>, diverging from
// the DOM spec (Promise<any>). This override restores the DOM behavior so
// parsed JSON bodies don't require a cast at every call site.
interface Body {
  json(): Promise<any>;
}
