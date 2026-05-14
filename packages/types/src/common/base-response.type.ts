export interface BaseResponseDto {
  created_at: string | Date
  updated_at: string | Date
}

export interface BaseAuditResponseDto extends BaseResponseDto {
  deleted_at?: string | Date | null
  created_by?: string | null
  updated_by?: string | null
  deleted_by?: string | null
}
