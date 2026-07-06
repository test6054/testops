import type { ExamCandidateResponse } from '@/apis/mark/exam-scope'
/**
 * 批改主链：考试考生名册 composable
 *
 * 用途：
 * - 在统计分析、班级薄弱、学生学情等页面统一加载某场考试的考生名册
 * - 从名册派生「班级选择项」与「学生选择项」，避免在 UI 上让教师手输 classId / studentUserId
 * - 切换 examId 时自动重载，调用方只需观察 examId 即可
 *
 * 后端契约：
 * - POST /api/mark/exams/candidates 返回 ExamCandidateResponse[]
 * - ExamCandidateResponse.className 由后端通过 edu-user 班级主数据回填
 *
 * 用法示例：
 * ```ts
 * const { classOptions, studentOptions, loading, load } = useMarkExamRoster()
 * watch(() => examId.value, (id) => void load(id))
 * ```
 */
import { computed, ref } from 'vue'
import { listExamCandidates } from '@/apis/mark/exam-scope'
import { showUserError } from '@/utils/error-handler'

export interface MarkClassOption {
  /** 班级 ID（后端 Long 字符串化） */
  value: string
  /** 下拉显示文案：班级名称 · n 名考生 */
  label: string
  /** 班级名称 */
  className: string
  /** 该班级在名册中的考生数量 */
  candidateCount: number
}

export interface MarkStudentOption {
  /** 学生用户 ID（后端 Long 字符串化） */
  value: string
  /** 下拉显示文案：姓名 (学号) · 班级名称 */
  label: string
  /** 学号，可用于二次搜索 */
  studentNo: string
  /** 学生姓名 */
  studentName: string
  /** 所属班级 ID，用于按班级联动过滤 */
  classId?: string
  /** 所属班级名称 */
  className?: string
}

export function useMarkExamRoster() {
  const candidates = ref<ExamCandidateResponse[]>([])
  const loading = ref(false)

  const classOptions = computed<MarkClassOption[]>(() => {
    const grouped = new Map<string, { className: string, count: number }>()
    for (const item of candidates.value) {
      const cid = item.classId
      if (!cid) continue
      const current = grouped.get(cid)
      if (!item.className) continue
      grouped.set(cid, {
        className: item.className,
        count: (current?.count ?? 0) + 1,
      })
    }
    return Array.from(grouped.entries())
      .sort((a, b) => {
        // 班级 ID 是数字字符串，按数值排序更稳定；非数字时退化为字符串排序
        const an = Number(a[0])
        const bn = Number(b[0])
        if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn
        return a[0].localeCompare(b[0])
      })
      .map(([classId, classInfo]) => ({
        value: classId,
        label: `${classInfo.className} · ${classInfo.count} 名考生`,
        className: classInfo.className,
        candidateCount: classInfo.count,
      }))
  })

  const studentOptions = computed<MarkStudentOption[]>(() => {
    return candidates.value.map((item) => ({
      value: item.studentUserId,
      studentNo: item.studentNo,
      studentName: item.studentName,
      classId: item.classId,
      className: item.className,
      label: item.classId
        ? `${item.studentName} (${item.studentNo}) · ${item.className}`
        : `${item.studentName} (${item.studentNo})`,
    }))
  })

  async function load(examId: string | undefined): Promise<void> {
    if (!examId) {
      candidates.value = []
      return
    }
    loading.value = true
    try {
      candidates.value = await listExamCandidates(examId)
    } catch (e) {
      candidates.value = []
      showUserError(e, '考生名册加载失败')
    } finally {
      loading.value = false
    }
  }

  function reset(): void {
    candidates.value = []
  }

  return {
    candidates,
    classOptions,
    studentOptions,
    loading,
    load,
    reset,
  }
}
