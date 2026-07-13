import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Deploy build'leri (CI) NEXT_STANDALONE=1 ile alınır: çıktı .next/standalone altına
// tüm runtime bağımlılıklarıyla paketlenir ve sunucuda build gerekmez.
// Lokal dev/test akışları (next start dahil) etkilenmesin diye koşulludur.
const enableStandalone = process.env.NEXT_STANDALONE === '1';

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  ...(enableStandalone ? { output: 'standalone' } : {}),
  experimental: {
    optimizePackageImports: ['lucide-react'],
    // pnpm monorepo: bağımlılıklar repo kökünde hoist edildiği için izleme kökü üst dizin.
    ...(enableStandalone ? { outputFileTracingRoot: path.join(__dirname, '..') } : {}),
  },
};

export default nextConfig;
