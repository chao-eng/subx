# SubX - Automated Video Subtitle Extraction & Translation Tool

SubX is a powerful tool designed for local or private cloud environments to automate the workflow of extracting and translating video subtitles. It leverages Large Language Models (LLMs) to provide high-quality, context-aware translations for your media library.

---

## 🌟 Key Features

- **Zero Upload**: Process large video files directly from your host or NAS via Docker volume mounts.
- **Smart Track Detection**: Automatically detects and extracts embedded subtitle tracks from containers like MKV, MP4, AVI, etc.
- **External Subtitle Support**: Directly translate standalone `.srt`, `.ass`, `.vtt` files.
- **Context-Aware Translation**: Uses LLMs with sliding context windows to ensure narrative consistency across subtitle chunks.
- **Glossary Management**: Maintain consistent translations for character names and specific terminology.
- **Bilingual Output**: Support for pure translated text or "Original + Translation" dual-language subtitles.
- **Real-time Monitoring**: Modern Web UI with live task progress updates via Server-Sent Events (SSE).

## 🚀 Quick Start

### 🐳 Using Docker (Recommended)

The easiest way to run SubX is via Docker Compose.

```yaml
services:
  subx:
    image: bujic/subx:latest
    container_name: subx
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - /path/to/your/movies:/media
      - subx-db:/app/db
    environment:
      - VIDEO_DIR=/media
      - DB_PATH=/app/db/subx.db
      - TZ=Asia/Shanghai

volumes:
  subx-db:
```

1. Run `docker-compose up -d`.
2. Access the UI at `http://localhost:3000`.
3. Configure your API Key and Model settings in the dashboard.

### 💻 Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

---

## 🛠️ Technology Stack

- **Frontend/Framework**: Nuxt 4, Nuxt UI (Tailwind CSS)
- **Runtime**: Node.js (Nitro engine)
- **Database**: SQLite (via `better-sqlite3`)
- **Processing**: FFmpeg (via `fluent-ffmpeg`)
- **AI Integration**: OpenAI SDK (compatible with any OpenAI-style API)

---

# SubX - 中文文档说明

SubX 是一款专为本地/私有云环境设计的 **自动化视频字幕提取与翻译工具**。它主要解决观看无官方中文字幕的视频时，手动寻找、提取和翻译字幕流程繁琐的问题。

## 🇨🇳 核心特性

- **零上传**：通过 Docker 目录挂载直接读取宿主机/NAS 上的视频，避免上传大文件。
- **智能解析**：自动探测视频内嵌的所有字幕轨道，支持一键提取。
- **外挂支持**：不仅支持内嵌字幕，也能直接翻译 `.srt` / `.ass` 等外挂文件。
- **上下文翻译**：利用大语言模型（LLM）进行分块翻译，保留剧情连贯性。
- **术语表**：支持自定义角色名、专有名词，确保全片翻译一致性。
- **双语输出**：支持生成纯译文或“原文+译文”对照字幕。
- **状态可视化**：实时推送长耗时翻译任务的进度。

## 📥 安装部署

### 🐳 Docker 部署（推荐）

在您的 `docker-compose.yml` 中添加以下配置：

```yaml
services:
  subx:
    image: bujic/subx:latest
    container_name: subx
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - /您的视频路径:/media
      - subx-db:/app/db
    environment:
      - VIDEO_DIR=/media
      - DB_PATH=/app/db/subx.db
```

运行 `docker-compose up -d` 后，通过浏览器访问 `http://localhost:3000` 即可使用。

### 📜 许可证

本项目采用 MIT 许可证。
