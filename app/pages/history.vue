<template>
  <div class="space-y-8">
    <div class="flex items-end justify-between border-b border-gray-100 dark:border-gray-800 pb-6">
      <div class="space-y-2">
        <UBreadcrumb :links="[{ label: '首页', icon: 'i-lucide-home', to: '/' }, { label: '历史', icon: 'i-lucide-history' }]" />
        <h2 class="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">翻译历史</h2>
        <p class="text-neutral-500 max-w-2xl">查看您之前的翻译任务，下载已翻译的 SRT 文件，或检查失败任务的错误日志。</p>
      </div>
      <UButton label="清空历史" variant="ghost" color="error" icon="i-lucide-trash-2" @click="isClearModalOpen = true" />
    </div>

    <div class="glass-panel rounded-3xl overflow-hidden p-2">
      <UTable :data="tasks" :columns="columns" :loading="pending">
        <template #status-cell="{ row }">
           <UBadge :color="statusColor(row.original.status)" variant="subtle" size="sm" class="capitalize">
             {{ row.original.status }}
           </UBadge>
        </template>
        <template #actions-cell="{ row }">
           <div class="flex items-center gap-2">
             <UButton icon="i-lucide-eye" variant="ghost" color="neutral" :to="`/task/${row.original.taskId}`" />
             <a v-if="row.original.status === 'done'" :href="`/api/tasks/${row.original.taskId}/download`" class="inline-flex items-center p-1.5 text-primary-500 hover:text-primary-700 dark:hover:text-primary-300 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
               <UIcon name="i-lucide-download" class="w-5 h-5" />
             </a>
           </div>
        </template>
      </UTable>
    </div>

    <UModal v-model:open="isClearModalOpen" title="确认清空历史记录" description="此操作将永久删除所有已完成和失败的任务，不可撤销。">
      <template #body>
        <div class="flex items-start gap-4">
          <div class="shrink-0 w-10 h-10 rounded-full bg-error-50 dark:bg-error-500/10 flex items-center justify-center ring-4 ring-error-50/50 dark:ring-error-500/20">
            <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 text-error-600 dark:text-error-400" />
          </div>
          <div class="space-y-1">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
              确定要执行清空操作吗？
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              您将失去对这些历史记录和底层的所有访问权限及缓存数据。仍在运行或排队中的任务将不受此操作影响。
            </p>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end w-full gap-3">
          <UButton label="取消" color="neutral" variant="ghost" @click="isClearModalOpen = false" />
          <UButton label="确定清空" color="error" variant="solid" :loading="isClearing" @click="clearHistory" />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup>
const isClearModalOpen = ref(false)
const isClearing = ref(false)
const toast = useToast()

const { data, pending, refresh } = await useFetch('/api/tasks')
const tasks = computed(() => data.value?.tasks || [])

async function clearHistory() {
  isClearing.value = true
  try {
    const res = await $fetch('/api/tasks', { method: 'DELETE' })
    toast.add({ title: '清理成功', description: `已清理 ${res.deletedCount} 条任务记录`, color: 'success' })
    isClearModalOpen.value = false
    await refresh()
  } catch (e) {
    toast.add({ title: '清理失败', description: '无法删除历史记录', color: 'error' })
  } finally {
    isClearing.value = false
  }
}

const columns = [
  { accessorKey: 'taskId', header: '任务 ID' },
  { accessorKey: 'filePath', header: '文件路径' },
  { accessorKey: 'status', header: '状态' },
  { accessorKey: 'progress', header: '进度' },
  { accessorKey: 'createdAt', header: '创建时间' },
  { id: 'actions', header: '操作' }
]

function statusColor(status) {
  switch (status) {
    case 'done': return 'success'
    case 'error': return 'error'
    case 'translating': return 'primary'
    default: return 'neutral'
  }
}
</script>
