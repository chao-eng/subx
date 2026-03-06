<template>
  <div class="px-1">
    <div
      class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors duration-200"
      :class="[
        node.isDir ? 'text-gray-600 dark:text-gray-400 font-medium' : 'text-gray-500 dark:text-gray-500 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/30'
      ]"
      @click="toggle"
    >
      <UIcon
        v-if="node.isDir"
        :name="isOpen ? 'i-lucide-folder-open' : 'i-lucide-folder'"
        class="w-4 h-4"
      />
      <UIcon v-else name="i-lucide-file-video" class="w-4 h-4" />
      <span class="text-sm truncate">{{ node.name }}</span>
    </div>

    <div v-if="isOpen && node.isDir" class="pl-4 border-l border-gray-100 dark:border-gray-800 ml-5 mt-1 space-y-1">
      <template v-for="child in node.children" :key="child.path">
        <FileNodeItem :node="child" @select="$emit('select', $event)" />
      </template>
    </div>
  </div>
</template>

<script setup>
const props = defineProps(['node'])
const emit = defineEmits(['select'])

const isOpen = ref(false)

function toggle() {
  if (props.node.isDir) {
    isOpen.value = !isOpen.value
  } else {
    emit('select', props.node)
  }
}
</script>
