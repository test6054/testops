<template>
  <UiStateBlock
    state="error"
    :title="resolvedTitle"
    :description="resolvedDescription"
    :helper="resolvedHelper"
    :size="size"
    :compact="compact"
  >
    <template #actions>
      <UiButton
        v-if="showRetry"
        variant="primary"
        size="sm"
        :loading="retrying"
        @click="handleRetry"
      >
        <template #icon>
          <ReloadOutlined />
        </template>
        {{ retryLabel }}
      </UiButton>
      <UiButton v-if="showReport" variant="outline" size="sm" @click="handleReport">
        <template #icon>
          <BugOutlined />
        </template>
        {{ reportLabel }}
      </UiButton>
      <slot name="extra-actions" />
    </template>
    <template v-if="$slots.body" #default>
      <slot name="body" />
    </template>
  </UiStateBlock>
</template>

<script lang="ts" setup>
import BugOutlined from '@ant-design/icons-vue/BugOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getUserErrorMessage } from '@/utils/error-handler'
import UiButton from './Button.vue'
import UiStateBlock from './UiStateBlock.vue'

/**
 * UiErrorRetryPanel
 *
 * D-9 错误态引导：把页面级"加载失败"统一为可恢复 + 可上报的态势。
 *
 * - 默认渲染 UiStateBlock(state=error) 并提供重试 / 上报问题双行动入口
 * - 上报问题默认跳转到 `/admin/audit-trail` 看板，并携带当前路径与 errorMessage 作为 query
 * - 调用方通过 `error` prop 传入捕获到的异常对象或字符串
 * - 通过 `onRetry` prop 或 `@retry` 事件传入重试函数；retrying 状态由组件自己管理
 *
 * 业务约束：
 * - 不替代页面级 `message.error` 的瞬时提示，仅替代"渲染区域空白 + 用户没有恢复动作"的痛点
 * - 不假设错误类型；网络错误 / 业务错误 / 鉴权错误的 description 都可以由调用方覆盖
 */
defineOptions({ name: 'UiErrorRetryPanel' })

const props = withDefaults(
  defineProps<{
    /** 捕获到的错误对象，或后端返回的错误描述字符串 */
    error?: unknown
    /** 顶部标题，默认 "数据加载失败" */
    title?: string
    /** 主体描述，默认从 error 中提取 message */
    description?: string
    /** 副提示行（可放具体上下文：考试 ID / 时间窗 等） */
    helper?: string
    /** 重试按钮文案 */
    retryLabel?: string
    /** 是否显示重试按钮（无重试场景可关闭） */
    showRetry?: boolean
    /** 上报问题按钮文案 */
    reportLabel?: string
    /** 是否显示上报问题按钮 */
    showReport?: boolean
    /** 上报问题跳转目标路由名称，默认 AdminAuditTrail */
    reportRouteName?: string
    /** 状态块尺寸 */
    size?: 'sm' | 'md' | 'lg'
    /** 紧凑模式 */
    compact?: boolean
    /** 直接传入的重试函数（与事件二选一） */
    onRetry?: () => Promise<void> | void
  }>(),
  {
    error: undefined,
    title: '',
    description: '',
    helper: '',
    retryLabel: '重试',
    showRetry: true,
    reportLabel: '上报问题',
    showReport: true,
    reportRouteName: 'AdminAuditTrail',
    size: 'md',
    compact: false,
    onRetry: undefined,
  },
)

const emit = defineEmits<{
  retry: []
  report: [{ message: string, route: string }]
}>()

const router = useRouter()
const retrying = ref(false)

const errorMessage = computed<string>(() => {
  return getUserErrorMessage(props.error, '')
})

const resolvedTitle = computed(() => props.title || '数据加载失败')

const resolvedDescription = computed(() => {
  if (props.description) return props.description
  if (errorMessage.value) {
    return errorMessage.value
  }
  return '当前内容加载失败，请稍后重试。'
})

const resolvedHelper = computed(() => props.helper)

async function handleRetry(): Promise<void> {
  if (retrying.value) return
  retrying.value = true
  try {
    if (props.onRetry) {
      await props.onRetry()
    }
    emit('retry')
  } finally {
    retrying.value = false
  }
}

function handleReport(): void {
  const currentRoute = router.currentRoute.value
  const reportData = {
    message: errorMessage.value,
    route: currentRoute.fullPath,
  }
  emit('report', reportData)
  // 默认行为：跳转 admin 审计看板，附带来源页 & 错误摘要
  void router.push({
    name: props.reportRouteName,
    query: {
      sourcePath: currentRoute.fullPath,
      errorMessage: errorMessage.value || '当前内容加载失败',
    },
  })
}
</script>
