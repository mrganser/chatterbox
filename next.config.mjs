/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  allowedDevOrigins: ['localhost'],
};

export default nextConfig;
