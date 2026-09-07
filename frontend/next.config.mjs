/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination:
          process.env.NODE_ENV === 'development'
            ? `${process.env.BACKEND_URL || 'http://127.0.0.1:8000'}/api/:path*`
            : (process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/:path*` : '/api/'),
      },
    ];
  },
};

export default nextConfig;
