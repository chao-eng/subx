<template>
  <div class="space-y-8">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 mt-12">
      <div class="space-y-4">
        <UBreadcrumb :links="[{ label: '首页', icon: 'i-lucide-home', to: '/' }]" />
        <h2 class="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">本地视频翻译区</h2>
        <p class="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl">浏览您的本地影视库，提取内嵌字幕，并使用先进的 AI 模型将其精准翻译成您的母语。</p>
      </div>
      <div class="flex items-center gap-3">
        <UButton label="任务历史" variant="outline" icon="i-lucide-history" color="neutral" to="/history" size="lg" />
      </div>
    </div>

    <!-- Main File Browser Section -->
    <FileBrowser />

    <div class="grid grid-cols-1 justify-items-center w-full mt-24">
       <!-- Use glass-card according to design system for features section -->
       <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <UCard class="glass-card ring-0" :ui="{ shadow: '' }">
            <template #header>
              <div class="flex items-center gap-3">
                  <div class="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                    <UIcon name="i-lucide-zap" class="text-amber-500 w-6 h-6" />
                  </div>
                  <h3 class="font-semibold text-gray-800 dark:text-gray-200">极速提取</h3>
              </div>
            </template>
            <p class="text-base text-neutral-600 dark:text-neutral-400">无论视频体积多大，都能在数秒内自动探测并提取包含多音轨和外挂字幕流。</p>
          </UCard>

          <UCard class="glass-card ring-0" :ui="{ shadow: '' }">
            <template #header>
              <div class="flex items-center gap-3">
                  <div class="p-2 bg-primary-50 dark:bg-primary-500/10 rounded-lg">
                    <UIcon name="i-lucide-message-square" class="text-primary-600 dark:text-primary-400 w-6 h-6" />
                  </div>
                  <h3 class="font-semibold text-gray-800 dark:text-gray-200">语境感知</h3>
              </div>
            </template>
            <p class="text-base text-neutral-600 dark:text-neutral-400">将对话级上下文发送给最新 AI 模型，运用专业影视翻译规则，确保前后连贯。</p>
          </UCard>

          <UCard class="glass-card ring-0" :ui="{ shadow: '' }">
            <template #header>
              <div class="flex items-center gap-3">
                  <div class="p-2 bg-fuchsia-50 dark:bg-fuchsia-500/10 rounded-lg">
                    <UIcon name="i-lucide-box" class="text-fuchsia-500 w-6 h-6" />
                  </div>
                  <h3 class="font-semibold text-gray-800 dark:text-gray-200">Docker 原生</h3>
              </div>
            </template>
            <p class="text-base text-neutral-600 dark:text-neutral-400">专门适配 NAS 与云服务器。无需反复上传离线大文件，安全且易于直接部署。</p>
          </UCard>
       </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  title: 'SubX - AI Subtitle Translator'
})
</script>
