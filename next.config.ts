import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    dirs: ['src']
  },
  // Add security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: https://*.tiles.mapbox.com https://*.mapbox.com https://basemaps.cartocdn.com; connect-src 'self' https://jheem.shinyapps.io https://api.mapbox.com https://*.tiles.mapbox.com https://events.mapbox.com https://basemaps.cartocdn.com https://abre4axci6.execute-api.us-east-1.amazonaws.com; frame-src 'self' https://jheem.shinyapps.io;"
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  }
};

export default nextConfig;
