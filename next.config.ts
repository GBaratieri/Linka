import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Evita que `next dev`/`next build` reescreva o CLAUDE.md do projeto
  // (arquivo de instruções mantido manualmente, não gerado pelo Next.js).
  agentRules: false,
};

export default nextConfig;
