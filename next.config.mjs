import { withPayload } from '@payloadcms/next/withPayload'

const fallbackPayloadSecret = 'dev-payload-secret-change-me'
if (!process.env.PAYLOAD_SECRET && process.env.NODE_ENV !== 'production')
{
  process.env.PAYLOAD_SECRET = fallbackPayloadSecret
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    localPatterns: [{ pathname: '/api/media/file/**' }, { pathname: '/**' }],
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  async headers ()
  {
    return [
      {
        source: '/((?!admin).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ...(appUrl.startsWith('https')
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
            : []),
        ],
      },
    ]
  },
}

console.log(
  '[env-check] PAYLOAD_SECRET available:',
  Boolean(process.env.PAYLOAD_SECRET),
)

console.log(
  '[env-check] working directory:',
  process.cwd(),
)

export default withPayload(nextConfig, { devBundleServerPackages: false })
