import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

// Generate build time in New York timezone
const buildTime = new Date().toLocaleString('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const nextConfig: NextConfig = {
  // 静态导出配置 (GitHub Pages)
  output: 'export',

  // GitHub Pages 部署路径: https://username.github.io/PetitionLetterFrontend/
  basePath: isProd ? '/PetitionLetterFrontend' : '',
  assetPrefix: isProd ? '/PetitionLetterFrontend/' : '',

  // 禁用图片优化 (静态导出不支持)
  images: {
    unoptimized: true,
  },

  // 尾部斜杠 (有助于 GitHub Pages 路由)
  trailingSlash: true,

  // 构建时环境变量
  env: {
    NEXT_PUBLIC_BUILD_TIME: buildTime,
  },
};

export default nextConfig;
