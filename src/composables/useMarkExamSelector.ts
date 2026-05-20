import type { DefaultOptionType, SelectValue } from 'ant-design-vue/es/select'
/**
 * 批改主链公共考试选择器 composable
 *
 * - 默认从 URL `query.examId` 初始化
 * - 自动加载当前租户 ACTIVE 状态的考试列表（普通教师仅看自己创建的，管理员看全部）
 * - 切换考试会同步写回 URL query，便于刷新和链接分享
 *
 * 用法示例：
 *   const { selectedExamId, examOptions, loading, init, onExamChange } = useMarkExamSelector()
 *   onMounted(init)
 */
import type { ExamSummaryVO } from '@/apis/mark/exam'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { pageExams } from '@/apis/mark/exam'
import { useAuthStore } from '@/stores/modules/auth'
import { useMarkExamContextStore } from '@/stores/modules/markExamContext'
import { useUserStore } from '@/stores/modules/user'

export interface MarkExamSelectorOptions {
  /** 是否在切换时自动回写 URL query，默认 true */
  syncUrl?: boolean
  /** 最大加载数量，默认 200 */
  maxLoad?: number
}

export interface MarkExamSelectOption {
  value: string
  label: string
}

export function useMarkExamSelector(options: MarkExamSelectorOptions = {}) {
  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const userStore = useUserStore()
  const examContext = useMarkExamContextStore()

  const syncUrl = options.syncUrl ?? true
  const maxLoad = options.maxLoad ?? 200

  const exams = ref<ExamSummaryVO[]>([])
  const loading = ref(false)

  // 应用优先级：URL > 全局 Store > 空
  const initialId
    = (route.query.examId ? String(route.query.examId) : '') || examContext.currentExamId || ''
  const selectedExamId = ref<string | undefined>(initialId || undefined)

  // 页面本地选择变化 → 同步到全局 Store，使跨页面访问保持一致
  watch(selectedExamId, (next) => {
    if (next && next !== examContext.currentExamId) {
      examContext.currentExamId = next
    } else if (!next && examContext.currentExamId) {
      examContext.currentExamId = ''
    }
  })

  // 全局 Store 变化 → 同步到本页面，保持多 Tab 一致
  watch(
    () => examContext.currentExamId,
    (next) => {
      if (next && next !== selectedExamId.value) {
        selectedExamId.value = next
        if (syncUrl) writeExamIdToUrl(next)
      }
    },
  )

  const selectedExam = computed<ExamSummaryVO | null>(
    () => exams.value.find((item) => item.examId === selectedExamId.value) ?? null,
  )

  const examOptions = computed<MarkExamSelectOption[]>(() =>
    exams.value.map((item) => ({
      value: item.examId,
      label: item.examNo ? `${item.examName} (${item.examNo})` : item.examName,
    })),
  )

  /** 是否管理员视角：可见本租户全部考试 */
  const isAdminView = computed(() => authStore.isAdmin || userStore.isTenantAdmin)

  async function loadExams(): Promise<void> {
    loading.value = true
    try {
      const result = await pageExams({
        pageNum: 1,
        pageSize: maxLoad,
        status: 'ACTIVE',
        createUserId: isAdminView.value ? null : userStore.userInfo.userId || undefined,
      })
      exams.value = result.list ?? []
      // 同步考试列表到全局 Store，供跨页面下拉复用
      examContext.exams = exams.value
      // URL / Store 都未指定时默认选第一个
      if (!selectedExamId.value && exams.value.length > 0) {
        selectedExamId.value = exams.value[0].examId
        if (syncUrl) {
          writeExamIdToUrl(selectedExamId.value)
        }
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : '考试列表加载失败'
      message.error(errMsg)
    } finally {
      loading.value = false
    }
  }

  function writeExamIdToUrl(examId: string | undefined): void {
    const nextQuery = { ...route.query }
    if (examId) {
      nextQuery.examId = examId
    } else {
      delete nextQuery.examId
    }
    void router.replace({ query: nextQuery })
  }

  function onExamChange(
    value: SelectValue,
    _option?: DefaultOptionType | DefaultOptionType[],
  ): void {
    const examId = value != null ? String(value) : undefined
    selectedExamId.value = examId
    if (syncUrl) {
      writeExamIdToUrl(examId)
    }
  }

  /** 便捷入口：加载考试列表（供 onMounted 调用） */
  async function init(): Promise<void> {
    await loadExams()
  }

  return {
    exams,
    examOptions,
    loading,
    selectedExamId,
    selectedExam,
    isAdminView,
    loadExams,
    onExamChange,
    init,
  }
}
