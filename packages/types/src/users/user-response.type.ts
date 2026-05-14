export interface UserResponseDto {
  id: string
  name: string
  email: string
  image: string | null
  roles: string[]
  banned: boolean
  banReason: string | null
  banExpires: string | Date | null
  createdAt: string | Date
}
