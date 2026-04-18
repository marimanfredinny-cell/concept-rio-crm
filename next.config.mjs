/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.ego.com.br' },
      { protocol: 'https', hostname: 'cdn.ego.imobiliario.com.br' },
    ],
  },
}

export default nextConfig
