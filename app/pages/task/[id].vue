<template>
  <div class="max-w-4xl mx-auto space-y-8 py-10">
    <div class="flex items-center gap-4 mb-8">
      <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" to="/history" />
      <div class="flex flex-col">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{{ task.step === 'done' ? '翻译任务完成' : task.step === 'error' ? '翻译任务失败' : '翻译任务进行中' }}</h2>
        <p class="text-sm text-neutral-500">任务 ID: {{ $route.params.id }}</p>
      </div>
    </div>

    <div class="glass-panel rounded-3xl overflow-hidden mb-6 p-2">
      <div class="p-8 space-y-8">
        <!-- Progress Circular/Linear -->
        <div class="space-y-4">
           <div class="flex justify-between items-end mb-2">
             <div class="flex flex-col">
               <span class="text-xs font-semibold text-primary-500 uppercase tracking-wider mb-1">{{ task.step }}</span>
               <h3 class="text-lg font-bold text-gray-800 dark:text-gray-200">
               <UIcon :name="stepIcon" class="mr-2 text-emerald-500" v-if="task.step === 'done'" />
               <UIcon :name="stepIcon" class="mr-2 text-red-500" v-else-if="task.step === 'error'" />
               <UIcon :name="stepIcon" class="mr-2 animate-pulse text-primary-500" v-else />
               {{ statusLabel }}
             </h3>
           </div>
           <div class="text-right">
             <span class="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{{ task.step === 'done' ? 100 : task.progress }}%</span>
           </div>
         </div>
         <UProgress :model-value="task.step === 'done' ? 100 : task.progress" size="xl" :color="task.step === 'error' ? 'error' : task.step === 'done' ? 'success' : 'primary'" class="h-3 rounded-full overflow-hidden" />
        </div>

        <!-- Error Message Alert -->
        <div v-if="task.step === 'error' && task.error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-2xl flex items-start gap-3">
           <UIcon name="i-lucide-alert-circle" class="w-5 h-5 text-red-500 mt-0.5" />
           <div class="space-y-1">
             <p class="text-sm font-bold text-red-800 dark:text-red-200">处理出错</p>
             <p class="text-xs text-red-700 dark:text-red-300 leading-relaxed">{{ task.error }}</p>
           </div>
        </div>

        <USeparator />

        <!-- Detail Grid -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="space-y-1">
            <span class="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">模型</span>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ task.model || '默认多模态模型' }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">目标语言</span>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ task.targetLanguage === 'zh-CN' ? '简体中文' : (task.targetLanguage || '自动') }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">分块进度</span>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300" v-if="task.step === 'done'">已完成</p>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300" v-else>{{ task.completedChunks || 0 }} / {{ task.totalChunks || '-' }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">任务状态</span>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{{ task.step }}</p>
          </div>
        </div>

        <!-- Terminal-like Console -->
        <div class="bg-gray-950 rounded-2xl p-4 font-mono text-xs overflow-hidden shadow-inner ring-1 ring-white/10 relative">
          <div class="flex items-center gap-1.5 mb-3">
             <div class="w-2.5 h-2.5 rounded-full bg-red-500/80" />
             <div class="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
             <div class="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
             <span class="ml-2 text-gray-500 text-[10px] uppercase font-bold">处理日志</span>
          </div>
          <div class="space-y-1.5 h-48 overflow-y-auto custom-scrollbar" ref="logContainer">
            <p v-for="(log, i) in logs" :key="i" :class="[log.type === 'error' ? 'text-red-400' : 'text-gray-400']">
              <ClientOnly>
                <span class="text-gray-600 mr-2">[{{ log.timestamp }}]</span>
              </ClientOnly>
              <span class="text-primary-500 mr-2">$</span>
              {{ log.message }}
            </p>
            <p v-if="task.currentText" class="text-emerald-400">
               <ClientOnly>
                 <span class="text-gray-600 mr-2">[{{ new Date().toLocaleTimeString() }}]</span>
               </ClientOnly>
               <span class="text-primary-500 mr-2">$</span>
               {{ task.currentText }}
            </p>
            <div v-if="task.progress < 100 && task.step !== 'error'" class="flex items-center gap-2 text-primary-400">
               <ClientOnly>
                 <span class="text-gray-600 mr-2">[{{ new Date().toLocaleTimeString() }}]</span>
               </ClientOnly>
               <span class="text-primary-500 mr-2">$</span>
               <span class="animate-pulse">_</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-between pt-4">
           <UButton v-if="task.step === 'done'" label="返回工作区" icon="i-lucide-check-circle" color="secondary" to="/" />
           <UButton v-else-if="task.step === 'error'" label="返回并重试" icon="i-lucide-refresh-cw" color="error" to="/" />
           <UButton v-else label="取消任务" icon="i-lucide-x-circle" color="error" variant="ghost" :loading="cancelling" @click="cancelTask" />
           
           <div v-if="task.step === 'done'" class="flex gap-2">
             <a
               :href="`/api/tasks/${taskId}/download`"
               class="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
             >
               <UIcon name="i-lucide-download" class="w-4 h-4" />
               下载 SRT
             </a>
           </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const route = useRoute()
const taskId = route.params.id

const task = ref({
  step: 'queued',
  progress: 0,
  completedChunks: 0,
  totalChunks: 0,
  currentText: '等待服务器响应...',
  error: null,
  model: null,
  targetLanguage: null
})

function downloadSrt() {
  window.location.assign(`/api/tasks/${taskId}/download`)
}

const cancelling = ref(false)
const toast = useToast()

async function cancelTask() {
  cancelling.value = true
  try {
    await $fetch('/api/tasks/cancel', { 
      method: 'POST',
      body: { taskId }
    })
    task.value.step = 'error'
    task.value.error = '用户取消任务'
    task.value.currentText = null
    logs.value.push({ type: 'error', message: '任务已被手动取消', timestamp: new Date().toLocaleTimeString() })
    if (eventSource.value) {
      eventSource.value.close()
    }
    toast.add({ title: '已取消', description: '任务已成功取消', color: 'success' })
  } catch (e) {
    toast.add({ title: '错误', description: '无法取消任务', color: 'error' })
  } finally {
    cancelling.value = false
  }
}

const logContainer = ref(null)

const logs = ref([
   { type: 'info', message: '任务初始化中，正在连接 SubX 引擎...', timestamp: new Date().toLocaleTimeString() }
])

// Auto-scroll logic
watch(logs, () => {
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
}, { deep: true })

const statusLabel = computed(() => {
  switch (task.value.step) {
    case 'queued': return '队列中'
    case 'extracting': return '正在提取字幕'
    case 'parsing': return '正在解析文本分块'
    case 'translating': return 'AI 翻译进行中'
    case 'exporting': return '正在生成输出文件'
    case 'done': return '任务圆满完成'
    case 'error': return '任务失败'
    default: return '正在处理...'
  }
})

const stepIcon = computed(() => {
  switch (task.value.step) {
    case 'queued': return 'i-lucide-clock'
    case 'extracting': return 'i-lucide-scissors'
    case 'parsing': return 'i-lucide-binary'
    case 'translating': return 'i-lucide-brain'
    case 'exporting': return 'i-lucide-file-output'
    case 'done': return 'i-lucide-check-circle-2'
    case 'error': return 'i-lucide-x-circle'
    default: return 'i-lucide-loader-2'
  }
})

// SSE Implementation
const eventSource = ref(null)

// Register cleanup BEFORE any async ops (must be synchronous in setup context)
onUnmounted(() => {
  if (eventSource.value) {
    eventSource.value.close()
  }
})

onMounted(async () => {
  // 1. Fetch initial state (important for already-completed tasks)
  try {
    const result = await $fetch(`/api/tasks/${taskId}`)
    const initialTask = result?.task
    if (initialTask) {
      task.value = {
        ...task.value,
        step: initialTask.status,
        progress: initialTask.progress || 0,
        completedChunks: initialTask.completedChunks || 0,
        totalChunks: initialTask.totalChunks || 0,
        error: initialTask.error || null,
        model: initialTask.model,
        targetLanguage: initialTask.targetLanguage
      }
      if (initialTask.status === 'done') {
        logs.value = [{ type: 'info', message: '任务已完成，成功从历史记录加载数据。', timestamp: new Date().toLocaleTimeString() }]
        task.value.currentText = null // 去除“等待服务器响应”文字
      } else if (initialTask.status === 'error') {
        logs.value = [{ type: 'error', message: `任务失败: ${initialTask.error}`, timestamp: new Date().toLocaleTimeString() }]
        task.value.currentText = null
      }
    }
  } catch (e) {
    // Task not found or other error - continue showing default state
    console.warn('[Task] Unable to fetch initial task state', e)
  }

  // 2. Skip SSE if task is already in terminal state
  if (task.value.step === 'done' || task.value.step === 'error') return

  // 3. Connect SSE for live updates
  const es = new EventSource(`/api/sse/progress?taskId=${taskId}`)
  eventSource.value = es
  
  let lastLoggedStep = null
  es.addEventListener('progress', (e) => {
    const data = JSON.parse(e.data)
    task.value = { ...task.value, ...data }
    
    // Handle Step Change Logs
    if (data.step && data.step !== lastLoggedStep) {
       lastLoggedStep = data.step
       const stepNames = {
         queued: '入队',
         extracting: '提取字幕',
         parsing: '解析文本',
         translating: 'AI 翻译',
         exporting: '导出文件',
         done: '完成',
         error: '出错'
       }
       const currentStepName = stepNames[data.step] || data.step
       logs.value.push({ 
         type: data.step === 'error' ? 'error' : 'info', 
         message: data.step === 'error' ? `状态变更: 任务失败` : `状态变更: ${currentStepName}`,
         timestamp: new Date().toLocaleTimeString()
       })
    }

    // Handle Granular Logs
    if (data.log) {
      logs.value.push({
        type: data.step === 'error' || data.log.includes('!!!') ? 'error' : 'info',
        message: data.log,
        timestamp: new Date().toLocaleTimeString()
      })
    }
  })

  es.onerror = () => {
    console.error('SSE Error')
    es.close()
  }
})
</script>

<style>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
}
</style>
