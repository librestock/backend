import { describe, expect, it, vi } from 'vitest';
import { normalizeDevelopmentTenantDomains } from './dev-tenant-domain-cleanup';

describe('normalizeDevelopmentTenantDomains', () => {
  it('returns update and conflict counts from the cleanup query result', async () => {
    const execute = vi.fn().mockResolvedValue({
      rows: [{ updated: '2', skipped_conflicts: '1' }],
    });

    await expect(
      normalizeDevelopmentTenantDomains({ execute } as never),
    ).resolves.toEqual({
      updated: 2,
      skippedConflicts: 1,
    });
    expect(execute).toHaveBeenCalledOnce();
  });
});
