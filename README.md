# SubX

SubX 是一款专为本地/私有云环境设计的 **AI 自动化视频字幕提取与翻译工具**。

它能够自动探测您的本地媒体库，提取视频流中嵌入的所有音轨与字幕轨道，并利用尖端的大语言模型（LLM）进行上下文感知的精准翻译。无论是美剧、动画还是纪录片，SubX 都能为您提供专业级的翻译工作流。

---

## 🌟 核心特性

- **🚀 极速解析与提取**：集成 `FFmpeg` 强力驱动，毫秒级探测视频元数据，秒级提取内嵌字幕轨道。
- **🎬 全面格式支持**：支持嵌入式字幕提取以及 `.srt`、`.ass`、`.vtt`、`.ssa` 等多种主流外挂字幕格式的读取与翻译。
- **👁️ 字幕实时预览**：在翻译前即可在 Web 界面预览字幕内容，支持 ASS 特殊换行符（如 `\N`）的正确渲染。
- **🧠 语境感知翻译**：利用 LLM 的超长上下文窗口进行分块翻译，确保角色称呼、剧情逻辑在全篇中高度连贯。
- **💎 极致 UI/UX 体验**：采用现代化的 **玻璃拟态（Glassmorphism）** 设计，支持深色/浅色模式切换，配备动态流光背景，提供沉浸式操作体验。
- **🛡️ 银行级安全架构**：
  - **基于口令的快速身份验证**：无需繁琐的用户名，仅凭口令即可全权管控。
  - **端到端加密传输**：客户端本地 SHA-256 预哈希，确保口令明文永不离开您的设备。
  - **服务端二次加固**：存储层与逻辑层双重哈希防护，保障实例安全。
- **📦 Docker 原生支持**：专为 NAS（群晖、铁威马等）和云服务器优化，通过目录挂载即可实现“零上传”处理大容量影视库。

---

## 🛠️ 技术栈

- **前端框架**：Nuxt 4 (Vue 3 + Nitro)
- **UI 组件库**：Nuxt UI (基于 Tailwind CSS)
- **数据库**：SQLite (通过 `better-sqlite3` 驱动)
- **媒体处理**：FFmpeg (通过 `fluent-ffmpeg`)
- **安全算法**：浏览器原生 Crypto API + Node.js Crypto

---

## 📥 安装与部署

### 🐳 使用 Docker (推荐)

在您的 `docker-compose.yml` 中添加以下配置：

```yaml
services:
  subx:
    image: bujidec/subx:latest
    container_name: subx
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - /path/to/your/movies:/media
      - ./db:/app/db
    environment:
      - VIDEO_DIR=/media
      - DB_PATH=/app/db/subx.db
      - TZ=Asia/Shanghai
```

### 💻 本地开发环境

1. **环境准备**：确保系统中已安装 `Node.js` (建议 v18+) 和 `FFmpeg`。
2. **配置环境变量**：在项目根目录创建 `.env` 文件：
   ```env
   # [必填] 视频挂载目录，程序会扫描此目录下的视频和字幕文件
   VIDEO_DIR=D:\Path\To\Your\Videos
   # [可选] SQLite 数据库存储路径
   DB_PATH=./demo_db/subx.db
   # 默认值: ./db/subx.db
   # [可选] win 需要显式配置FFmpeg 路径
   FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe
   FFPROBE_PATH=C:\ffmpeg\bin\ffprobe.exe
   ```
3. **启动项目**：
   ```bash
   # 安装依赖
   nom install
   # 启动开发服务器
   nom dev
   ```

---

## 🔐 初始设置说明

1. **首次启动**：项目启动后会自动进入“初始化口令密钥”页面，引导您设置访问口令。
2. **访问保护**：设置完成后，任何对 API 或页面的访问都必须经过口令验证。
3. **会话管理**：登录状态支持 Web 持久化，无需频繁输入口令。

---

## 📜 许可证

本项目采用 **MIT** 许可证，您可以自由地进行二次开发与分发。
