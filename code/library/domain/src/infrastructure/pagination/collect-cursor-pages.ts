import type { CursorPageInput } from './cursor-page.input.ts';

export async function collectCursorPages<T>(load: (nextToken?: string) => Promise<CursorPageInput<T>>): Promise<T[]> {
  const items: T[] = [];
  const seen = new Set<string>();
  let nextToken: string | undefined;
  do {
    const page = await load(nextToken);
    items.push(...page.items);
    if (page.meta.nextToken === null) return items;
    if (seen.has(page.meta.nextToken)) throw new Error('Cursor pagination did not advance.');
    seen.add(page.meta.nextToken);
    nextToken = page.meta.nextToken;
  } while (true);
}
