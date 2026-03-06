<template>
  <div class="space-y-6">
    <!-- Top Row: API Key with Help Button -->
    <div class="space-y-1">
      <div class="flex items-center justify-between">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">OpenAI API 密钥</label>
        <UButton
          label="没有密钥？"
          variant="link"
          color="primary"
          size="xs"
          class="p-0 font-bold"
          @click="isHelpOpen = true"
        />
      </div>
      <p class="text-xs text-neutral-500 mb-2">您的 OpenAI 或代理 API 密钥。</p>
      <UInput v-model="config.apiKey" type="password" placeholder="sk-..." icon="i-lucide-key" class="w-full" @blur="tryFetchModels" />
    </div>

    <!-- Second Row: API Base URL (Full Width) -->
    <UFormField label="API 基础 URL" description="自定义 API 终点（例如 Ollama, One-API）。" class="w-full">
      <UInput v-model="config.apiBaseUrl" placeholder="https://api.openai.com/v1" icon="i-lucide-globe" class="w-full" @blur="tryFetchModels" />
    </UFormField>

    <!-- 默认模型独占一行 -->
    <UFormField label="默认模型">
      <div class="space-y-2">
        <div class="flex gap-2">
          <USelect
            v-if="modelItems.length"
            v-model="config.defaultModel"
            :items="modelItems"
            class="flex-1 min-w-0"
            :ui="{ width: 'w-full' }"
          />
          <UInput
            v-else
            v-model="config.defaultModel"
            placeholder="gpt-4o-mini"
            class="flex-1"
          />
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            size="sm"
            :loading="fetchingModels"
            @click="tryFetchModels"
            title="获取模型列表"
          />
        </div>
        <div v-if="fetchingModels" class="flex items-center gap-2 text-xs text-gray-500">
          <UIcon name="i-lucide-loader-2" class="w-3 h-3 animate-spin" />
          正在获取模型列表...
        </div>
        <div v-else-if="modelError" class="text-xs text-amber-600 dark:text-amber-400">
          {{ modelError }}
        </div>
        <div v-else-if="modelItems.length" class="text-xs text-green-600 dark:text-green-400">
          已加载 {{ modelItems.length }} 个可用模型
        </div>
      </div>
    </UFormField>

    <div class="grid grid-cols-2 gap-4">
      <UFormField label="目标语言">
        <USelect v-model="config.targetLanguage" :items="['zh-CN', 'zh-TW', 'en', 'ja', 'ko']" class="w-full" />
      </UFormField>
      <UFormField label="输出模式">
        <USelect v-model="config.outputMode" :items="[{ label: '仅显示翻译', value: 'translated' }, { label: '双语对照', value: 'bilingual' }]" class="w-full" />
      </UFormField>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <UFormField label="分块大小 (Token)" description="较小的值可防止 AI 输出被截断。">
        <UInputNumber v-model="config.chunkSize" :min="100" :max="4000" :step="100" class="w-full" />
      </UFormField>
      <UFormField label="并发任务数" description="同时进行的翻译请求数量。">
        <UInputNumber v-model="config.concurrency" :min="1" :max="10" class="w-full" />
      </UFormField>
    </div>

    <div class="flex justify-end pt-4 border-t dark:border-gray-800 gap-3">
      <UButton label="取消" variant="ghost" color="neutral" @click="emit('close')" />
      <UButton label="保存修改" color="primary" :loading="pending" @click="save" />
    </div>

    <!-- Help Slideover -->
    <USlideover
      v-model:open="isHelpOpen"
      title="获取大模型密钥指南"
      description="按照下方的详细步骤，您可以快速开通并获取适配 SubX 的大模型 API 密钥。"
      :ui="{ width: 'max-w-xl' }"
    >
      <template #content>
        <!-- Outer wrapper must be h-full and flex-col -->
        <div class="h-full flex flex-col overflow-hidden bg-white dark:bg-gray-950">
          <!-- Scrolling area with flex-1 and min-h-0 to enable scrolling -->
          <div class="flex-1 overflow-y-auto min-h-0 p-6 space-y-8">
            <div class="bg-primary-50 dark:bg-primary-900/10 p-5 rounded-2xl border border-primary-100 dark:border-primary-800">
              <p class="text-sm text-primary-900 dark:text-primary-100 leading-relaxed font-medium">
                为了让 SubX 飞速运转，你需要一个大模型的“钥匙”。别担心，目前大厂都在疯狂送福利，只需 2 分钟即可免费获取！
              </p>
            </div>

            <!-- Route A -->
            <section class="space-y-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <UIcon name="i-lucide-zap" class="text-amber-600 dark:text-amber-400 w-5 h-5" />
                </div>
                <h4 class="font-bold text-lg text-gray-900 dark:text-white">路线 A：火山引擎</h4>
              </div>
              
              <div class="pl-2 border-l-2 border-amber-100 dark:border-amber-900/30 space-y-4 ml-4">
                <div class="space-y-2">
                  <p class="text-sm font-bold text-gray-800 dark:text-gray-200">1. 前往官网</p>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    访问 <a href="https://console.volcengine.com/ark/" target="_blank" class="text-primary-500 hover:underline font-medium">火山引擎大模型控制台</a> 并点击进入“方舟实验室”。
                  </p>
                </div>

                <div class="space-y-2">
                  <p class="text-sm font-bold text-gray-800 dark:text-gray-200">2. 开通模型</p>
                  <p class="text-sm text-gray-600 dark:text-gray-400">在左侧菜单找到“在线推理”，点击“创建推理接入点”。推荐选择免费额度巨大的 <strong>Doubao-pro</strong> 模型。</p>
                </div>

                <div class="space-y-2">
                  <p class="text-sm font-bold text-gray-800 dark:text-gray-200">3. 获取密钥</p>
                  <p class="text-sm text-gray-600 dark:text-gray-400">在“API Key 管理”中创建一个新 Key 并复制。</p>
                </div>

                <div class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">填入 SubX</p>
                  <div class="space-y-2 font-mono text-xs">
                    <p class="break-all flex gap-2">
                      <span class="text-gray-400 shrink-0 w-12">URL:</span>
                      <code class="text-primary-600 dark:text-primary-400">https://ark.cn-beijing.volces.com/api/v3</code>
                    </p>
                    <p class="flex gap-2 text-amber-600 dark:text-amber-400 font-bold">
                      <span class="shrink-0 text-amber-500/50 w-12">MODEL:</span>
                      <span>填入您的“接入点 ID”（例如 ep-2024...）</span>
                    </p>
                    <p class="flex gap-2">
                      <span class="text-gray-400 shrink-0 w-12">KEY:</span>
                      <span class="text-gray-600 dark:text-gray-300">填入你刚复制的字符串</span>
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <!-- Route B -->
            <section class="space-y-4 pb-8">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <UIcon name="i-lucide-globe" class="text-blue-600 dark:text-blue-400 w-5 h-5" />
                </div>
                <h4 class="font-bold text-lg text-gray-900 dark:text-white">路线 B：Google AI Studio</h4>
              </div>

              <div class="pl-2 border-l-2 border-blue-100 dark:border-blue-900/30 space-y-4 ml-4">
                <div class="space-y-2">
                  <p class="text-sm font-bold text-gray-800 dark:text-gray-200">1. 创建 Key</p>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    访问 <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-primary-500 hover:underline font-medium">Google AI Studio</a>。点击左下角 <strong>Get API Key</strong> 即可一键生成。
                  </p>
                </div>

                <div class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">填入 SubX</p>
                  <div class="space-y-2 font-mono text-xs">
                    <p class="break-all flex gap-2">
                      <span class="text-gray-400 shrink-0 w-12">URL:</span>
                      <code class="text-primary-600 dark:text-primary-400">https://generativelanguage.googleapis.com/v1beta/openai/</code>
                    </p>
                    <p class="flex gap-2 text-blue-600 dark:text-blue-400 font-bold">
                      <span class="shrink-0 text-blue-500/50 w-12">MODEL:</span>
                      <span>gemini-1.5-flash-latest</span>
                    </p>
                    <p class="flex gap-2">
                      <span class="text-gray-400 shrink-0 w-12">KEY:</span>
                      <span class="text-gray-600 dark:text-gray-300">填入你刚生成的字符串</span>
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
          
          <!-- Fixed footer -->
          <div class="p-6 shrink-0 border-t dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
            <UButton block label="我明白了" color="neutral" variant="outline" @click="isHelpOpen = false" />
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>

<script setup>
const emit = defineEmits(['close'])
const isHelpOpen = ref(false)
const { data } = await useFetch('/api/config')
const config = ref(data.value || {})
// Initialize numbers correctly to satisfy UI types
if (config.value) {
  if (config.value.chunkSize) config.value.chunkSize = Number(config.value.chunkSize)
  if (config.value.concurrency) config.value.concurrency = Number(config.value.concurrency)
}
const pending = ref(false)
const toast = useToast()

// Models fetching
const modelItems = ref([])
const fetchingModels = ref(false)
const modelError = ref('')

// Auto-fetch models on mount if credentials are already configured
onMounted(() => {
  if (config.value?.apiKey && config.value?.apiBaseUrl) {
    tryFetchModels()
  }
})

async function tryFetchModels() {
  const apiKey = config.value?.apiKey?.trim()
  const baseURL = config.value?.apiBaseUrl?.trim()
  
  if (!apiKey || !baseURL) return

  fetchingModels.value = true
  modelError.value = ''

  try {
    const res = await $fetch('/api/model-list', {
      method: 'POST',
      body: { apiKey, baseURL }
    })
    modelItems.value = res.models.map(m => ({
      // 去掉 models/ 前缀让显示更清爽，但保留完整的 ID 作为 value
      label: m.id.startsWith('models/') ? m.id.replace('models/', '') : m.id,
      value: m.id
    }))
  } catch (e) {
    modelError.value = '无法获取模型列表，请检查密钥和 URL 是否正确'
    modelItems.value = []
  } finally {
    fetchingModels.value = false
  }
}

async function save() {
  pending.value = true
  try {
    await $fetch('/api/config', {
      method: 'PUT',
      body: config.value
    })
    toast.add({ title: '成功', description: '设置已保存', color: 'success' })
    emit('close')
  } catch (e) {
    toast.add({ title: '错误', description: '无法保存设置', color: 'danger' })
  } finally {
    pending.value = false
  }
}
</script>
