/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile the shared workspace package so its TypeScript is bundled directly.
  transpilePackages: ['@leadarrow/shared'],
};

export default nextConfig;
