<template>
  <ErrorPage v-if="hasError" kind="render-error" embedded />
  <slot v-else />
</template>

<script lang="ts" setup>
import { onErrorCaptured, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ErrorPage from '@/views/error/components/ErrorPage.vue'

defineOptions({ name: 'UiErrorBoundary' })

const hasError = ref(false)
const route = useRoute()

onErrorCaptured((error) => {
  if (import.meta.env.DEV) {
    console.error('[UiErrorBoundary]', error)
  }
  hasError.value = true
  return false
})

watch(
  () => route.fullPath,
  () => {
    hasError.value = false
  },
)
</script>
