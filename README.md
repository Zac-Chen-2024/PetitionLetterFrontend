# Petition Letter Frontend

[English](#english) | [中文](#中文)

---

## English

### About

A Next.js frontend for the L1 visa petition letter automation system. This tool helps immigration attorneys and petitioners prepare supporting documents for L1 visa applications by:

- **Document Processing** - Upload and OCR scanned PDFs
- **Evidence Highlighting** - AI-powered key evidence extraction with visual highlights
- **L1 Criteria Analysis** - Automatic analysis against L1 visa requirements
- **Relationship Mapping** - Visual graph of entities and their relationships across documents
- **Letter Writing** - AI-assisted petition letter generation with citations

### Features

- Multi-language support (English/Chinese)
- Real-time backend connection status
- PDF viewer with highlight overlay
- Citation tracking and management
- Style template customization
- Version history and rollback

### Quick Start

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/PetitionLetterFrontend.git
cd PetitionLetterFrontend

# 2. Configure
cp .env.example .env.local
# Edit .env.local with your backend URL

# 3. Run
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API URL | `http://localhost:8000` |

### Project Structure

```
src/
├── app/                  # Next.js App Router
│   ├── page.tsx          # Main application page
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/           # React components
│   ├── UploadModule.tsx      # Document upload
│   ├── OCRModule.tsx         # OCR processing
│   ├── HighlightModule.tsx   # Evidence highlighting
│   ├── L1AnalysisModule.tsx  # L1 criteria analysis
│   ├── RelationshipModule.tsx # Entity relationship graph
│   └── WritingModule.tsx     # Letter writing
├── hooks/                # Custom React hooks
├── i18n/                 # Internationalization
├── types/                # TypeScript types
└── utils/                # Utility functions
    └── api.ts            # API client
```

### Deploy Your Own

Want to deploy your own instance with Cloudflare Tunnel? See the [**Deployment Guide**](docs/DEPLOY_YOUR_OWN.md).

### Related Projects

- [PetitionLetterBackend](https://github.com/YOUR_USERNAME/PetitionLetterBackend) - FastAPI backend with OCR and LLM

---

## 中文

### 项目简介

这是 L1 签证申请信自动化系统的 Next.js 前端。该工具帮助移民律师和申请人准备 L1 签证申请的支持文件：

- **文档处理** - 上传和 OCR 扫描的 PDF
- **证据高亮** - AI 驱动的关键证据提取和可视化高亮
- **L1 标准分析** - 根据 L1 签证要求自动分析
- **关系图谱** - 跨文档的实体及其关系的可视化图谱
- **信件撰写** - AI 辅助的申请信生成（带引用）

### 功能特性

- 多语言支持（英文/中文）
- 实时后端连接状态
- 带高亮叠加层的 PDF 查看器
- 引用跟踪和管理
- 风格模板自定义
- 版本历史和回滚

### 快速开始

```bash
# 1. 克隆
git clone https://github.com/YOUR_USERNAME/PetitionLetterFrontend.git
cd PetitionLetterFrontend

# 2. 配置
cp .env.example .env.local
# 编辑 .env.local，填入你的后端 URL

# 3. 运行
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)

### 环境变量配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NEXT_PUBLIC_API_BASE_URL` | 后端 API 地址 | `http://localhost:8000` |

### 项目结构

```
src/
├── app/                  # Next.js App Router
│   ├── page.tsx          # 主应用页面
│   ├── layout.tsx        # 根布局
│   └── globals.css       # 全局样式
├── components/           # React 组件
│   ├── UploadModule.tsx      # 文档上传
│   ├── OCRModule.tsx         # OCR 处理
│   ├── HighlightModule.tsx   # 证据高亮
│   ├── L1AnalysisModule.tsx  # L1 标准分析
│   ├── RelationshipModule.tsx # 实体关系图谱
│   └── WritingModule.tsx     # 信件撰写
├── hooks/                # 自定义 React Hooks
├── i18n/                 # 国际化
├── types/                # TypeScript 类型
└── utils/                # 工具函数
    └── api.ts            # API 客户端
```

### 部署你自己的实例

想要使用 Cloudflare Tunnel 部署你自己的实例？请查看 [**部署指南**](docs/DEPLOY_YOUR_OWN.md)。

### 相关项目

- [PetitionLetterBackend](https://github.com/YOUR_USERNAME/PetitionLetterBackend) - 带 OCR 和 LLM 的 FastAPI 后端
