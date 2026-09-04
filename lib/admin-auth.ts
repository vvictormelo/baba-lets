import { NextRequest } from 'next/server'

export function checkAdminAuth(req: NextRequest): boolean {
  const password = req.headers.get('x-admin-password')
  return password === process.env.ADMIN_PASSWORD
}
