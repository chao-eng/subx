<template>
  <div class="flex h-[750px] gap-6 glass-panel rounded-3xl p-5 overflow-hidden">
    <!-- File Browser (Left) -->
    <div class="w-1/2 flex flex-col border-r border-gray-100 dark:border-gray-700 pr-4">
      <div class="flex items-center gap-2 mb-4">
        <UIcon name="i-lucide-folder" class="w-5 h-5 text-primary-500" />
        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">文件浏览器</h3>
        <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" size="xs" :loading="loadingFiles" @click="refreshFiles" title="刷新文件" class="ml-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
      </div>
      
      <div class="flex-1 overflow-y-auto space-y-1">
        <template v-for="node in files" :key="node.path">
          <FileNodeItem :node="node" @select="onSelect" />
        </template>
      </div>
    </div>

    <!-- Track & Options (Right) -->
    <div class="w-1/2 flex flex-col pl-4">
      <div v-if="selectedFile" class="h-full flex flex-col">
        <div class="flex items-center gap-2 mb-4">
          <UIcon :name="isSubtitleFile ? 'i-lucide-file-text' : 'i-lucide-video'" class="w-5 h-5 text-sky-500" />
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ isSubtitleFile ? '准备直接翻译: ' : '轨道列表: ' }}{{ selectedFile.name }}</h3>
        </div>

        <div v-if="isSubtitleFile" class="flex flex-col items-center justify-center p-8 bg-sky-50 dark:bg-sky-900/20 rounded-xl text-center flex-1 mb-4">
          <UIcon name="i-lucide-languages" class="w-8 h-8 text-sky-500 mb-2" />
          <p class="text-sm text-sky-700 dark:text-sky-300 font-medium">已选择字幕文件</p>
          <p class="text-xs text-sky-600/70 dark:text-sky-400 mt-1">无需轨道分离，直接提交即可开始多线程翻译任务</p>
        </div>

        <template v-else>
          <div v-if="pendingTracks" class="flex items-center justify-center h-32">
            <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
          </div>
          
          <div v-else-if="tracks.length" class="flex-1 space-y-2 overflow-y-auto py-2">
            <URadioGroup v-model="selectedTrackIndex" :items="trackOptions" />
          </div>
          
          <div v-else class="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900 rounded-xl text-center flex-1 mb-4">
            <UIcon name="i-lucide-info" class="w-8 h-8 text-neutral-400 mb-2" />
            <p class="text-sm text-neutral-500">此视频中未找到内嵌的字幕轨道。</p>
          </div>
        </template>

        <div class="mt-auto space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <UFormField label="翻译风格">
            <USelect v-model="options.stylePreset" :items="styleOptions" />
          </UFormField>
          <div v-if="currentStyle" class="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 transition-all">
            <UIcon :name="currentStyle.icon" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
            <div class="space-y-0.5 min-w-0">
              <p class="text-xs font-semibold text-gray-800 dark:text-gray-200">{{ currentStyle.name }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{{ currentStyle.description }}</p>
            </div>
          </div>
          <UFormField label="目标语言">
            <USelect v-model="options.targetLanguage" :items="['zh-CN', 'zh-TW', 'en']" />
          </UFormField>
          <UFormField label="输出模式">
             <USelect v-model="options.outputMode" :items="[{ label: '仅显示翻译', value: 'translated' }, { label: '双语对照', value: 'bilingual' }]" />
          </UFormField>
          <UButton label="开始 AI 翻译" color="primary" block icon="i-lucide-sparkles" :loading="launching" @click="startTask" />
        </div>
      </div>

      <div v-else class="h-full flex flex-col items-center justify-center text-center px-4">
        <div class="p-4 bg-gray-50 dark:bg-gray-900 rounded-full mb-4">
          <UIcon name="i-lucide-file-video-2" class="w-12 h-12 text-neutral-300" />
        </div>
        <h4 class="text-lg font-medium text-gray-700 dark:text-gray-300">请选择一个视频或字幕文件</h4>
        <p class="text-sm text-neutral-500 mt-2 italic px-8">SubX 会自动提取 mkv 视频内嵌字幕，或直接翻译独立的 .srt / .vtt 文件。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
const { data: files, refresh, pending: loadingFiles } = await useFetch('/api/files')
const selectedFile = ref(null)

async function refreshFiles() {
  await refresh()
  toast.add({ title: '已刷新文件列表', color: 'success' })
}
const toast = useToast()
const tracks = ref([])
const pendingTracks = ref(false)
const selectedTrackIndex = ref(null)
const launching = ref(false)

import { STYLE_PRESETS } from '~~/shared/stylePresets'

const styleOptions = STYLE_PRESETS.map(s => ({
  label: `${s.name}`,
  value: s.id
}))

const options = ref({
  stylePreset: 'default',
  targetLanguage: 'zh-CN',
  outputMode: 'translated'
})

const currentStyle = computed(() => STYLE_PRESETS.find(s => s.id === options.value.stylePreset))

const trackOptions = computed(() => {
  return tracks.value.map(t => ({
    label: `轨道 #${t.index} (${t.codec}) - ${t.language} ${t.title ? `[${t.title}]` : ''}`,
    value: t.index
  }))
})

const isSubtitleFile = computed(() => {
  if (!selectedFile.value) return false
  const name = selectedFile.value.name.toLowerCase()
  return name.endsWith('.srt') || name.endsWith('.vtt')
})

async function onSelect(node) {
  if (node.isDir) return
  
  const ext = node.name.toLowerCase()
  if (!ext.endsWith('.mkv') && !ext.endsWith('.srt') && !ext.endsWith('.vtt')) {
    toast.add({ title: '格式不支持', description: '目前视频仅支持 .mkv 格式，或直接选择 .srt / .vtt 字幕文件。', color: 'amber' })
    return
  }

  selectedFile.value = node
  tracks.value = []
  
  if (isSubtitleFile.value) {
    selectedTrackIndex.value = 0
    return // Stop checking for tracks in text files
  }

  pendingTracks.value = true
  
  try {
    const res = await $fetch('/api/tracks', { query: { path: node.path } })
    tracks.value = res.tracks
    if (tracks.value.length) selectedTrackIndex.value = tracks.value[0].index
  } catch (e) {
    toast.add({ title: '错误', description: '无法分析视频轨道', color: 'danger' })
  } finally {
    pendingTracks.value = false
  }
}

async function startTask() {
  if (selectedTrackIndex.value === null) return
  launching.value = true
  try {
    const res = await $fetch('/api/task', {
      method: 'POST',
      body: {
        filePath: selectedFile.value.path,
        sourceType: isSubtitleFile.value ? 'external' : 'embedded',
        trackIndex: isSubtitleFile.value ? 0 : selectedTrackIndex.value,
        ...options.value
      }
    })
    toast.add({ title: '成功', description: '任务已提交', color: 'success' })
    // Refresh page or switch view
    navigateTo(`/task/${res.taskId}`)
  } catch (e) {
    toast.add({ title: '错误', description: '无法开始翻译任务', color: 'danger' })
  } finally {
    launching.value = false
  }
}
</script>
