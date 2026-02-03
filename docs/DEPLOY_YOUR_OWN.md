# Deploy Your Own Instance / 部署你自己的实例

[English](#english) | [中文](#中文)

---

## English

This guide explains how to deploy your own instance of the Petition Letter system with your own Cloudflare Tunnel.

### Prerequisites

Before you begin, make sure you have:

- **Cloudflare Account** - Free account at [cloudflare.com](https://cloudflare.com)
- **Domain Name** - A domain managed by Cloudflare DNS
- **GPU Server** - RunPod, Vast.ai, or any server with GPU for the backend (for OCR and LLM inference)
- **Node.js 20+** - For building the frontend
- **Git** - For cloning repositories

### Architecture Overview

```
┌─────────────────┐     HTTPS      ┌──────────────────┐     Tunnel     ┌─────────────────┐
│   Your Browser  │ ◄────────────► │ Cloudflare Tunnel │ ◄────────────► │  GPU Backend    │
│   (Frontend)    │                │  (your-domain)    │                │  (RunPod etc.)  │
└─────────────────┘                └──────────────────┘                └─────────────────┘
```

### Step 1: Clone Repositories

```bash
# Clone frontend
git clone https://github.com/YOUR_USERNAME/PetitionLetterFrontend.git
cd PetitionLetterFrontend

# Clone backend (in a separate directory)
cd ..
git clone https://github.com/YOUR_USERNAME/PetitionLetterBackend.git
```

### Step 2: Setup Cloudflare Tunnel

#### 2.1 Create a Tunnel

1. Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. Navigate to **Networks** → **Tunnels**
3. Click **Create a tunnel**
4. Choose **Cloudflared** as the connector
5. Name your tunnel (e.g., `petition-letter-api`)
6. Save the **Tunnel Token** - you'll need this later

#### 2.2 Configure Public Hostname

1. In the tunnel configuration, go to **Public Hostname**
2. Add a new public hostname:
   - **Subdomain**: `api` (or your choice)
   - **Domain**: Select your domain
   - **Service Type**: `HTTP`
   - **URL**: `localhost:8000`
3. Save the configuration

Your API will be accessible at `https://api.your-domain.com`

#### 2.3 Run Cloudflared on Your GPU Server

On your GPU server (RunPod, etc.):

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# Run the tunnel (replace with your token)
cloudflared tunnel run --token YOUR_TUNNEL_TOKEN
```

For RunPod, you can add this to your startup script or run it in the background:

```bash
nohup cloudflared tunnel run --token YOUR_TUNNEL_TOKEN > /dev/null 2>&1 &
```

### Step 3: Configure Frontend

#### 3.1 Setup Environment Variables

```bash
cd PetitionLetterFrontend

# Copy example env file
cp .env.example .env.local

# Edit .env.local
# Set your Cloudflare Tunnel domain:
# NEXT_PUBLIC_API_BASE_URL=https://api.your-domain.com
```

#### 3.2 Update basePath (Optional)

If deploying to a different GitHub repository name, update `next.config.ts`:

```typescript
// Change this line to match your repository name
basePath: isProd ? '/YourRepoName' : '',
assetPrefix: isProd ? '/YourRepoName/' : '',
```

### Step 4: Deploy

#### Option A: Local Development

```bash
npm install
npm run dev
# Open http://localhost:3000
```

#### Option B: GitHub Pages

1. Push your code to GitHub
2. Go to repository **Settings** → **Pages**
3. Set source to **GitHub Actions**
4. Add repository variable:
   - Go to **Settings** → **Secrets and variables** → **Actions** → **Variables**
   - Add `API_BASE_URL` = `https://api.your-domain.com`
5. Push to `main` branch to trigger deployment

#### Option C: Manual Build

```bash
npm install
npm run build
# Static files are in ./out directory
# Deploy to any static hosting (Vercel, Netlify, etc.)
```

### Step 5: Start Backend

On your GPU server:

```bash
cd PetitionLetterBackend

# Install dependencies
pip install -r requirements.txt

# Start the server
python main.py
# Server runs on http://localhost:8000
```

### Verification

1. **Check Backend Connection**
   ```bash
   curl https://api.your-domain.com/api/health
   ```
   Should return `{"status": "ok", ...}`

2. **Check Frontend**
   - Open your deployed frontend URL
   - The backend status indicator (top-right) should show connected

### Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Backend already has CORS enabled for all origins |
| Tunnel not connecting | Check token, ensure cloudflared is running |
| API returns 502 | Backend not running, check `python main.py` |
| Frontend can't reach API | Check `NEXT_PUBLIC_API_BASE_URL` in .env.local |

---

## 中文

本指南介绍如何使用你自己的 Cloudflare Tunnel 部署 Petition Letter 系统。

### 前置条件

开始之前，请确保你有：

- **Cloudflare 账号** - 在 [cloudflare.com](https://cloudflare.com) 注册免费账号
- **域名** - 一个托管在 Cloudflare DNS 的域名
- **GPU 服务器** - RunPod、Vast.ai 或任何有 GPU 的服务器（用于后端 OCR 和 LLM 推理）
- **Node.js 20+** - 用于构建前端
- **Git** - 用于克隆仓库

### 架构概览

```
┌─────────────────┐     HTTPS      ┌──────────────────┐     Tunnel     ┌─────────────────┐
│    你的浏览器    │ ◄────────────► │ Cloudflare Tunnel │ ◄────────────► │   GPU 后端      │
│    (前端)       │                │   (你的域名)       │                │  (RunPod 等)    │
└─────────────────┘                └──────────────────┘                └─────────────────┘
```

### 第一步：克隆仓库

```bash
# 克隆前端
git clone https://github.com/YOUR_USERNAME/PetitionLetterFrontend.git
cd PetitionLetterFrontend

# 克隆后端（在另一个目录）
cd ..
git clone https://github.com/YOUR_USERNAME/PetitionLetterBackend.git
```

### 第二步：配置 Cloudflare Tunnel

#### 2.1 创建 Tunnel

1. 访问 [Cloudflare Zero Trust 控制台](https://one.dash.cloudflare.com/)
2. 导航到 **Networks** → **Tunnels**
3. 点击 **Create a tunnel**
4. 选择 **Cloudflared** 作为连接器
5. 为你的 Tunnel 命名（例如 `petition-letter-api`）
6. 保存 **Tunnel Token** - 稍后会用到

#### 2.2 配置公共主机名

1. 在 Tunnel 配置中，进入 **Public Hostname**
2. 添加新的公共主机名：
   - **Subdomain（子域名）**: `api`（或你选择的名称）
   - **Domain（域名）**: 选择你的域名
   - **Service Type（服务类型）**: `HTTP`
   - **URL**: `localhost:8000`
3. 保存配置

你的 API 将可以通过 `https://api.your-domain.com` 访问

#### 2.3 在 GPU 服务器上运行 Cloudflared

在你的 GPU 服务器（RunPod 等）上：

```bash
# 安装 cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# 运行 Tunnel（替换为你的 Token）
cloudflared tunnel run --token YOUR_TUNNEL_TOKEN
```

对于 RunPod，你可以将此添加到启动脚本或在后台运行：

```bash
nohup cloudflared tunnel run --token YOUR_TUNNEL_TOKEN > /dev/null 2>&1 &
```

### 第三步：配置前端

#### 3.1 设置环境变量

```bash
cd PetitionLetterFrontend

# 复制示例环境变量文件
cp .env.example .env.local

# 编辑 .env.local
# 设置你的 Cloudflare Tunnel 域名：
# NEXT_PUBLIC_API_BASE_URL=https://api.your-domain.com
```

#### 3.2 更新 basePath（可选）

如果部署到不同的 GitHub 仓库名，更新 `next.config.ts`：

```typescript
// 修改此行以匹配你的仓库名
basePath: isProd ? '/YourRepoName' : '',
assetPrefix: isProd ? '/YourRepoName/' : '',
```

### 第四步：部署

#### 选项 A：本地开发

```bash
npm install
npm run dev
# 打开 http://localhost:3000
```

#### 选项 B：GitHub Pages

1. 将代码推送到 GitHub
2. 进入仓库 **Settings** → **Pages**
3. 将 source 设置为 **GitHub Actions**
4. 添加仓库变量：
   - 进入 **Settings** → **Secrets and variables** → **Actions** → **Variables**
   - 添加 `API_BASE_URL` = `https://api.your-domain.com`
5. 推送到 `main` 分支触发部署

#### 选项 C：手动构建

```bash
npm install
npm run build
# 静态文件在 ./out 目录
# 部署到任何静态托管（Vercel、Netlify 等）
```

### 第五步：启动后端

在你的 GPU 服务器上：

```bash
cd PetitionLetterBackend

# 安装依赖
pip install -r requirements.txt

# 启动服务器
python main.py
# 服务器运行在 http://localhost:8000
```

### 验证

1. **检查后端连接**
   ```bash
   curl https://api.your-domain.com/api/health
   ```
   应该返回 `{"status": "ok", ...}`

2. **检查前端**
   - 打开你部署的前端 URL
   - 右上角的后端状态指示器应显示已连接

### 故障排除

| 问题 | 解决方案 |
|------|----------|
| CORS 错误 | 后端已经为所有来源启用了 CORS |
| Tunnel 无法连接 | 检查 Token，确保 cloudflared 正在运行 |
| API 返回 502 | 后端未运行，检查 `python main.py` |
| 前端无法访问 API | 检查 .env.local 中的 `NEXT_PUBLIC_API_BASE_URL` |
