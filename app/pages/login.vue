<template>
  <div class="relative w-full h-screen flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-950">
    <!-- Animated Background Orbs -->
    <div class="absolute inset-0 z-0">
      <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-400/20 dark:bg-primary-600/10 blur-[120px] rounded-full animate-blob"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-sky-400/20 dark:bg-sky-600/10 blur-[120px] rounded-full animate-blob animation-delay-2000"></div>
    </div>

    <div class="relative z-10 w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <!-- Logo & Brand -->
      <div class="text-center mb-10 space-y-4">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-[2.5rem] bg-gradient-to-br from-primary-400 to-primary-600 shadow-2xl shadow-primary-500/30 mb-2 transform hover:scale-110 transition-transform duration-500">
          <UIcon name="i-lucide-shield-check" class="w-10 h-10 text-white" />
        </div>
        <div class="space-y-1">
          <h1 class="text-3xl font-black tracking-tight text-gray-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400">SubX Auth</h1>
          <p class="text-sm font-medium text-neutral-500 dark:text-neutral-400">安全驱动的字幕协作空间</p>
        </div>
      </div>

      <!-- Insecure Connection Warning -->
      <ClientOnly>
        <div v-if="isInsecure" class="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20 flex items-start gap-3 animate-pulse">
          <UIcon name="i-lucide-shield-alert" class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div class="space-y-1">
            <p class="text-xs font-bold text-amber-700 dark:text-amber-400">连接不安全</p>
            <p class="text-[10px] text-amber-600 dark:text-amber-500/80 leading-relaxed">检测到当前正在通过非 HTTPS 连接访问。为了您的密钥安全，建议在生产环境启用 SSL 加密。</p>
          </div>
        </div>
      </ClientOnly>

      <!-- Main Card -->
      <div class="glass-panel border-white/40 dark:border-white/5 rounded-[2rem] p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.12)] backdrop-blur-2xl">
        <!-- Setup Mode -->
        <form v-if="!hasPasskey" class="space-y-6" @submit.prevent="handleSetup">
          <div class="space-y-2">
            <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">初始化实例</h2>
            <p class="text-xs text-neutral-500 leading-relaxed">检测到这是该 SubX 实例的首次启动。请设置一个高强度口令密钥以保护您的媒体库。</p>
          </div>

          <div class="space-y-4">
            <UFormField label="设置口令密钥" required>
              <UInput
                v-model="passkey"
                :type="showPasskey ? 'text' : 'password'"
                placeholder="设置 4 位以上强口令"
                size="xl"
                icon="i-lucide-key-round"
                class="w-full"
                autocomplete="new-password"
                :ui="{ trailing: 'pointer-events-auto', rounded: 'rounded-xl' }"
              >
                <template #trailing>
                  <UButton
                    :icon="showPasskey ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    class="mr-1"
                    type="button"
                    @click="showPasskey = !showPasskey"
                  />
                </template>
              </UInput>
            </UFormField>

            <UFormField label="重复口令进行确认" required>
              <UInput
                v-model="confirmPasskey"
                :type="showPasskey ? 'text' : 'password'"
                placeholder="请再次填写"
                size="xl"
                icon="i-lucide-lock"
                class="w-full"
                autocomplete="new-password"
                :ui="{ rounded: 'rounded-xl' }"
              />
            </UFormField>
          </div>

          <div v-if="error" class="p-3 rounded-xl bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20 flex items-start gap-2 animate-in fade-in zoom-in-95 duration-300">
            <UIcon name="i-lucide-alert-circle" class="w-4 h-4 text-red-500 mt-0.5" />
            <span class="text-xs text-red-600 dark:text-red-400 font-medium">{{ error }}</span>
          </div>

          <UButton
            label="启用安全防护并进入"
            color="primary"
            block
            size="xl"
            icon="i-lucide-shield-plus"
            :loading="loading"
            type="submit"
            class="shadow-lg shadow-primary-500/20 rounded-xl"
          />
        </form>

        <!-- Login Mode -->
        <form v-else class="space-y-6" @submit.prevent="handleLogin">
          <div class="space-y-2">
            <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">欢迎回来</h2>
            <p class="text-xs text-neutral-500 leading-relaxed">您的内容已受到加密保护，请输入口令密钥以解锁工作区。</p>
          </div>

          <UFormField label="口令密钥" required>
            <UInput
              v-model="passkey"
              :type="showPasskey ? 'text' : 'password'"
              placeholder="••••••••"
              size="xl"
              icon="i-lucide-fingerprint"
              class="w-full"
              autocomplete="current-password"
              :ui="{ trailing: 'pointer-events-auto', rounded: 'rounded-xl' }"
            >
              <template #trailing>
                <UButton
                  :icon="showPasskey ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  class="mr-1"
                  type="button"
                  @click="showPasskey = !showPasskey"
                />
              </template>
            </UInput>
          </UFormField>

          <div v-if="error" class="p-3 rounded-xl bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20 flex items-start gap-2 animate-in fade-in zoom-in-95 duration-300">
            <UIcon name="i-lucide-alert-circle" class="w-4 h-4 text-red-500 mt-0.5" />
            <span class="text-xs text-red-600 dark:text-red-400 font-medium">{{ error }}</span>
          </div>

          <UButton
            label="解 锁"
            color="primary"
            block
            size="xl"
            icon="i-lucide-unlock"
            :loading="loading"
            type="submit"
            class="shadow-lg shadow-primary-500/20 rounded-xl"
          />
        </form>
      </div>


      <!-- Enhanced Footer -->
      <div class="mt-10 flex flex-col items-center gap-4">
        <div class="flex items-center gap-2 text-[11px] font-medium text-neutral-400 tracking-wider uppercase">
          <UIcon name="i-lucide-binary" class="w-3.5 h-3.5" />
          <span>SHA-256 Encrypted Session</span>
        </div>
        <div class="flex items-center gap-6">
          <UButton icon="i-lucide-help-circle" variant="ghost" color="neutral" size="xs" label="获取帮助" class="text-neutral-500" />
          <UButton icon="i-lucide-github" variant="ghost" color="neutral" size="xs" label="GitHub" to="https://github.com/chao-eng/subx" target="_blank" class="text-neutral-500" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
useHead({
  title: '身份验证 - SubX'
})

definePageMeta({
  layout: false
})

const { hasPasskey, check, setup, login } = useAuth()

const passkey = ref('')
const confirmPasskey = ref('')
const showPasskey = ref(false)
const loading = ref(false)
const error = ref('')
const isInsecure = ref(false)

onMounted(() => {
  if (window.location.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    isInsecure.value = true
  }
})

// 进入页面时检查状态
await check()

async function handleSetup() {
  error.value = ''

  if (passkey.value.length < 4) {
    error.value = '口令密钥长度不得少于 4 个字符'
    return
  }

  if (passkey.value !== confirmPasskey.value) {
    error.value = '两次输入的口令密钥不一致'
    return
  }

  loading.value = true
  try {
    await setup(passkey.value)
    navigateTo('/')
  } catch (e) {
    error.value = e.data?.message || '创建失败，请重试'
  } finally {
    loading.value = false
  }
}

async function handleLogin() {
  error.value = ''

  if (!passkey.value) {
    error.value = '请输入口令密钥'
    return
  }

  loading.value = true
  try {
    await login(passkey.value)
    navigateTo('/')
  } catch (e) {
    error.value = e.data?.message || '口令密钥错误'
  } finally {
    loading.value = false
  }
}
</script>
