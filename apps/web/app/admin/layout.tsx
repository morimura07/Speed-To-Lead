'use client';

import { AdminAuthProvider } from '../../lib/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
