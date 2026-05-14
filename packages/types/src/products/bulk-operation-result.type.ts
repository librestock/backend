export interface BulkOperationResultDto {
  success_count: number
  failure_count: number
  succeeded: string[]
  failures: { id?: string; sku?: string; error: string }[]
}
