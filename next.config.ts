import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

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
};

export default nextConfig;
