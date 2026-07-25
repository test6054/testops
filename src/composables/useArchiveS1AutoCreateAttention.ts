import type { ArchiveVolumeExamAutoCreateAttentionSummaryVO } from '@/apis/mark/archive-volume'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getArchiveVolumeExamAutoCreateAttentionSummary } from '@/apis/mark/archive-volume'
import { showUserError } from '@/utils/error-handler'

/**
 * 列表 / 配置页 S1 待自动建袋摘要：真源 PENDING + MANUAL_REQUIRED。
 * 有待办才展示提示条；1 场直达归档复盘，多场去考试列表。
 */
export function useArchiveS1AutoCreateAttention() {
  const router = useRouter()
  const loading = ref(false)
  const loadFailed = ref(false)
  const summary = ref<ArchiveVolumeExamAutoCreateAttentionSummaryVO | null>(null)

  const attentionExamCount = computed(() => summary.value?.attentionExamCount ?? 0)
  const pendingRetryExamCount = computed(() => summary.value?.pendingRetryExamCount ?? 0)
  const manualRequiredExamCount = computed(() => summary.value?.manualRequiredExamCount ?? 0)

  const attentionExamIdSet = computed(() => {
    const ids = new Set<string>()
    for (const examId of summary.value?.attentionExamIds ?? []) {
      if (examId) {
        ids.add(String(examId))
      }
    }
    return ids
  })

  const tipVisible = computed(() => {
    if (loading.value === true && !summary.value && loadFailed.value !== true) {
      return false
    }
    if (loadFailed.value) {
      return true
    }
    return attentionExamCount.value > 0
  })

  const tipTone = computed<'info' | 'warning'>(() => {
    if (loadFailed.value || manualRequiredExamCount.value > 0) {
      return 'warning'
    }
    return 'info'
  })

  const tipTitle = computed(() => {
    if (loadFailed.value) {
      return '待自动建袋考试数加载失败'
    }
    return `线上阅卷待自动建袋 · ${attentionExamCount.value} 场`
  })

  const tipDescription = computed(() => {
    if (loadFailed.value) {
      return '无法获取待自动建袋考试数。请重试；勿在此重复新建课程考核袋。'
    }
    if (!summary.value) {
      return ''
    }
    const samples = summary.value.sampleExams ?? []
    const firstName = samples[0]?.examName?.trim()
    const parts: string[] = []
    parts.push(
      `共 ${attentionExamCount.value} 场线上考试待自动建袋（调度中 ${pendingRetryExamCount.value} · 需人工 ${manualRequiredExamCount.value}）。`,
    )
    if (firstName) {
      if (attentionExamCount.value === 1) {
        parts.push(`考试「${firstName}」请到工作台「归档复盘」查看并打开卷。`)
      } else {
        parts.push(`例如「${firstName}」等，请到考试工作台「归档复盘」处理。`)
      }
    } else {
      parts.push('请到考试工作台「归档复盘」查看自动建袋并打开卷。')
    }
    parts.push('勿在此重复新建课程考核袋。')
    return parts.join('')
  })

  const primarySampleExamId = computed(() => {
    const examId = summary.value?.sampleExams?.[0]?.examId
    return examId ? String(examId) : ''
  })

  const primaryActionLabel = computed(() => {
    if (loadFailed.value || attentionExamCount.value <= 0) {
      return ''
    }
    if (attentionExamCount.value === 1 && primarySampleExamId.value) {
      return '去归档复盘'
    }
    return '去考试列表'
  })

  const showExamListSecondary = computed(
    () => !loadFailed.value && attentionExamCount.value === 1 && !!primarySampleExamId.value,
  )

  async function load(): Promise<void> {
    if (loading.value === true) {
      return
    }
    loading.value = true
    try {
      const result = await getArchiveVolumeExamAutoCreateAttentionSummary()
      summary.value = {
        attentionExamCount: result.attentionExamCount ?? 0,
        pendingRetryExamCount: result.pendingRetryExamCount ?? 0,
        manualRequiredExamCount: result.manualRequiredExamCount ?? 0,
        sampleExams: result.sampleExams ?? [],
        attentionExamIds: (result.attentionExamIds ?? []).map((id) => String(id)),
      }
      loadFailed.value = false
    } catch (error) {
      summary.value = null
      loadFailed.value = true
      showUserError(error, '待自动建袋考试数加载失败')
    } finally {
      loading.value = false
    }
  }

  function goExamList() {
    void router.push({ name: 'TeacherExamList' })
  }

  function goPrimaryAction() {
    if (attentionExamCount.value === 1 && primarySampleExamId.value) {
      void router.push({
        name: 'TeacherExamWorkspaceArchivePackage',
        params: { examId: primarySampleExamId.value },
      })
      return
    }
    goExamList()
  }

  function isAttentionExam(examId: string | number | null | undefined): boolean {
    if (examId == null || examId === '') {
      return false
    }
    return attentionExamIdSet.value.has(String(examId))
  }

  return {
    loading,
    loadFailed,
    summary,
    attentionExamCount,
    pendingRetryExamCount,
    manualRequiredExamCount,
    attentionExamIdSet,
    tipVisible,
    tipTone,
    tipTitle,
    tipDescription,
    primarySampleExamId,
    primaryActionLabel,
    showExamListSecondary,
    load,
    goExamList,
    goPrimaryAction,
    isAttentionExam,
  }
}
