/** @type {import('next').NextConfig} */
// A versão nova é publicada em um subcaminho (padrão: /app) para conviver com
// a versão legado, que continua servida na raiz do domínio.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }]
  }
};

export default nextConfig;
