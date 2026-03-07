<template>
  <UApp>
    <div class="min-h-screen bg-gray-50/50 dark:bg-gray-950">
      <header v-if="!isLoginPage" class="glass-panel sticky top-4 z-50 rounded-2xl mx-4 sm:mx-6 lg:mx-8 max-w-7xl lg:inset-x-0 lg:mx-auto">
        <div class="h-16 px-4 sm:px-6 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <img src="/favicon.ico" alt="SubX Logo" class="w-8 h-8 rounded-lg shadow-sm" />
            <NuxtLink to="/" class="text-xl font-black text-primary-600 dark:text-primary-400 hover:opacity-80 transition-opacity">SubX</NuxtLink>
            <span class="text-gray-300 dark:text-gray-700 font-light hidden sm:inline-block">|</span>
            <span class="text-sm font-medium text-gray-500 dark:text-gray-400 hidden sm:inline-block tracking-wide">自动化视频字幕提取与翻译工具</span>
          </div>
          <div class="flex items-center gap-4">
             <UButton icon="i-lucide-settings" variant="ghost" color="neutral" @click="isSettingsOpen = true" />
             <UButton v-if="authenticated" icon="i-lucide-log-out" variant="ghost" color="neutral" title="登出" @click="handleLogout" />
             <UButton icon="i-lucide-github" variant="ghost" color="neutral" to="https://github.com/chao-eng/subx" target="_blank" />
             <UButton
               :icon="colorMode.value === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'"
               variant="ghost"
               color="neutral"
               @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
             />
          </div>
        </div>
      </header>

      <main :class="[isLoginPage ? 'w-full h-screen' : 'max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8']">
        <NuxtPage />
      </main>

      <UModal v-model:open="isSettingsOpen" title="设置" description="配置全局翻译偏好、语言模型连接及处理参数" :ui="{ width: '!max-w-3xl w-[90vw]' }">
        <template #content>
          <div class="p-6">
            <Settings @close="isSettingsOpen = false" />
          </div>
        </template>
      </UModal>
      
      <UToaster />
    </div>
  </UApp>
</template>

<script setup>
const isSettingsOpen = ref(false)
const colorMode = useColorMode()
const { logout, authenticated } = useAuth()
const route = useRoute()

const isLoginPage = computed(() => route.path === '/login' || route.path === '/login/')

async function handleLogout() {
  await logout()
}
</script>

<style>
/* Global styles if needed */
</style>
