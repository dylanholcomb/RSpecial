/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The @google-cloud/firestore client uses gRPC with native (compiled) bindings.
  // Next.js's webpack bundler mangles those bindings unless the package is
  // explicitly marked external — symptoms include cryptic "undefined: undefined"
  // gRPC transport errors at runtime with empty metadata.
  // Also marking @google-cloud/vertexai for consistency (it currently works
  // because it uses plain HTTP, but listing it here is harmless and future-proof).
  experimental: {
    serverComponentsExternalPackages: [
      "@google-cloud/firestore",
      "@google-cloud/vertexai",
    ],
  },
};

module.exports = nextConfig;
