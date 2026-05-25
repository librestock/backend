export interface SuperAdminCreateTenantResponse {
  tenant: {
    id: string
    name: string
    slug: string
    hostname: string
  }
  admin: {
    id: string
    email: string
    name: string
  }
}
