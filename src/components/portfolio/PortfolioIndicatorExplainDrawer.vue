<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  open: boolean
  explainText?: string
  explainStructJson?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const parsedStruct = computed(() => {
  if (!props.explainStructJson) {
    return null
  }
  try {
    return JSON.stringify(JSON.parse(props.explainStructJson), null, 2)
  } catch {
    return props.explainStructJson
  }
})

function close() {
  emit('update:open', false)
}
</script>

<template>
  <a-drawer :open="open" title="规则解释" width="480" @close="close">
    <p v-if="explainText">
      {{ explainText }}
    </p>
    <pre v-if="parsedStruct" class="struct">{{ parsedStruct }}</pre>
  </a-drawer>
</template>

<style scoped>
.struct {
  margin-top: var(--dp-space-3);
  padding: var(--dp-space-3);
  background: var(--dp-surface-subtle);
  border-radius: var(--dp-radius-xs);
  font-size: var(--dp-font-size-xs);
  overflow: auto;
}
</style>
