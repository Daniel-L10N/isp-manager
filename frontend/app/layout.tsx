import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import './globals.css';

export const metadata: Metadata = {
  title: 'ISP Manager',
  description: 'Sistema de Administración para Empresas de Internet',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <Layout>{children}</Layout>
        </AuthProvider>
      </body>
    </html>
  );
}
