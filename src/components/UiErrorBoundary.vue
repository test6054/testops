<template>
  <ErrorPage v-if="hasError" kind="render-error" embedded />
  <slot v-else />
</template>

<script lang="ts" setup>
import { onErrorCaptured, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { message } from '@/utils/feedback'
import ErrorPage from '@/views/error/components/ErrorPage.vue'

defineOptions({ name: 'UiErrorBoundary' })

const hasError = ref(false)
const route = useRoute()

onErrorCaptured((error) => {
  if (import.meta.env.DEV) {
    console.error('[UiErrorBoundary]', error)
  }
  // 渲染异常：右上角 Message + 可刷新的内嵌错误区；禁止整页跳转路由 404
  message.error('页面暂时无法完成操作，请刷新当前页面后重试')
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
