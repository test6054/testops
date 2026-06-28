import type { Ref } from 'vue'
import type { ExamDetailVO } from '@/apis/mark/exam'
import { computed, ref, watch } from 'vue'
import { getExamDetail } from '@/apis/mark/exam'
import { useUserStore } from '@/stores'

export interface ConfidentialWatermarkViewer {
  department?: string
  displayName: string
  identifierLabel: '工号' | '学号'
  identifierValue: string
}

export interface BuildConfidentialWatermarkOptions {
  examLabel?: string
  viewer?: ConfidentialWatermarkViewer
}

/** 构建涉密页面平铺水印文案（学院 / 姓名 / 工号或学号 / 考试标识） */
export function buildConfidentialWatermarkLines(options: BuildConfidentialWatermarkOptions = {}): string[] {
  const userStore = useUserStore()
  const viewer = options.viewer ?? resolveStaffWatermarkViewer(userStore)
  const lines: string[] = []

  if (viewer.department) {
    lines.push(`学院 ${viewer.department}`)
  }
  lines.push(`姓名 ${viewer.displayName}`)
  lines.push(`${viewer.identifierLabel} ${viewer.identifierValue}`)
  if (options.examLabel) {
    lines.push(options.examLabel)
  }
  return lines
}

function resolveStaffWatermarkViewer(userStore: ReturnType<typeof useUserStore>): ConfidentialWatermarkViewer {
  return {
    department: userStore.teacherDetails?.department || userStore.userInfo.schoolName || undefined,
    displayName: userStore.nickname,
    identifierLabel: '工号',
    identifierValue: userStore.teacherDetails?.teacherNumber || userStore.username,
  }
}

export function formatExamConfidentialLabel(source: Pick<ExamDetailVO, 'examName' | 'examNo'> | null | undefined): string {
  if (!source) {
    return ''
  }
  return `${source.examName}（${source.examNo}）`
}

export function isExamConfidentialFlag(value: boolean | undefined | null): boolean {
  return value === true
}

/** 按考试 ID 拉取详情并解析涉密标记；后端未返回时保持 false。 */
export function useExamConfidential(examId: Ref<string>) {
  const confidential = ref(false)
  const examLabel = ref('')

  watch(
    examId,
    async (id) => {
      confidential.value = false
      examLabel.value = ''
      if (!id) {
        return
      }
      try {
        const detail = await getExamDetail(id)
        confidential.value = isExamConfidentialFlag(detail.confidential)
        examLabel.value = formatExamConfidentialLabel(detail)
      }
      catch {
        confidential.value = false
        examLabel.value = ''
      }
    },
    { immediate: true },
  )

  const watermarkLines = computed(() => (
    confidential.value
      ? buildConfidentialWatermarkLines({ examLabel: examLabel.value })
      : []
  ))

  return {
    confidential,
    examLabel,
    watermarkLines,
  }
}
