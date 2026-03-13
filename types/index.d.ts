/** 字幕条目 */
export interface SubtitleEntry {
  id: string
  startTime: string      // "00:00:01,000"
  endTime: string        // "00:00:03,500"
  text: string           // 原文
  translatedText?: string // 译文
}

/** 翻译分块 */
export interface TranslationChunk {
  chunkIndex: number
  entries: SubtitleEntry[]
  status: 'pending' | 'translating' | 'completed' | 'failed'
  retryCount: number
}

/** 翻译任务 */
export interface TranslationTask {
  taskId: string
  filePath: string             // 源文件路径
  sourceType: 'embedded' | 'external'  // 内嵌字幕 or 外挂字幕
  trackIndex?: number          // 内嵌字幕轨道索引
  model: string                // 使用的模型
  targetLanguage: string       // 目标语言（如 zh-CN）
  outputMode: 'translated' | 'bilingual' // 纯译文 or 双语
  stylePreset: string              // 翻译风格预设 ID
  status: TaskStatus
  progress: number             // 0-100
  totalChunks: number
  completedChunks: number
  createdAt: string            // ISO 8601
  updatedAt: string
  error?: string
  outputPath?: string          // 输出文件路径
}

/** 任务状态枚举 */
export type TaskStatus =
  | 'queued'
  | 'extracting'
  | 'parsing'
  | 'translating'
  | 'exporting'
  | 'done'
  | 'error'

/** 应用配置 */
export interface AppConfig {
  apiKey: string               // 加密存储
  apiBaseUrl: string           // 支持自定义 Base URL
  defaultModel: string         // 默认模型
  targetLanguage: string       // 默认目标语言
  chunkSize: number            // 分块大小（Token或行数）
  concurrency: number          // 并发数
  maxRetries: number           // 最大重试次数
  glossary: Record<string, string>  // 术语表
}

/** 文件节点 (用于文件浏览器) */
export interface FileNode {
  name: string
  path: string
  isDir: boolean
  children?: FileNode[]
}

/** 轨道信息 */
export interface TrackInfo {
  index: number
  codec: string
  language?: string
  title?: string
}

/** SSE 进度更新数据 */
export interface ProgressUpdate {
  step: TaskStatus
  progress: number
  completedChunks?: number
  totalChunks?: number
  currentText?: string
}

declare module 'js-sha256' {
  export function sha256(message: any): string;
  export namespace sha256 {
    export function sha256(message: any): string;
    export function sha224(message: any): string;
  }
}
