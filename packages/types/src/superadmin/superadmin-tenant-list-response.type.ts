export interface SuperAdminTenantListItem {
  id: string
  name: string
  slug: string
  primaryHostname: string | null
  createdAt: string
}

export interface SuperAdminTenantListResponse {
  data: SuperAdminTenantListItem[]
}
