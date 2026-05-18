/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@excalidraw/excalidraw"],
  images: {
    // Allow local /public images (default) + data URIs for inline image uploads
    unoptimized: false,
  },
  // Silence the Supabase build warning about missing env vars
  // (they will be set in .env.local at runtime)
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
