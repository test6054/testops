import type {
  ExamCandidateResponse,
  ExamClassStudentTreeNodeResponse,
} from '@/apis/mark/exam-scope'
import { listExamStudentTree, pageExamCandidates } from '@/apis/mark/exam-scope'
/**
 * 批改主链：考试考生名册 composable
 *
 * 用途：
 * - 在统计分析、班级薄弱、学生学情等页面加载某场考试的班级选项与学生候选
 * - 班级选项来自名册学生树；学生下拉走后端 keyword / classId 分页搜索
 * - 切换 examId 时自动重载，调用方只需观察 examId 即可
 */
import { ref } from 'vue'
import { ExamClassStudentTreeNodeTypeCode } from '@/types/enums/exam-class-student-tree-node-type-enum'
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

const ROSTER_STUDENT_PAGE_SIZE = 20

function mapCandidateToStudentOption(item: ExamCandidateResponse): MarkStudentOption {
  return {
    value: item.studentUserId,
    studentNo: item.studentNo,
    studentName: item.studentName,
    classId: item.classId,
    className: item.className,
    label:
      item.classId && item.className
        ? `${item.studentName} (${item.studentNo}) · ${item.className}`
        : `${item.studentName} (${item.studentNo})`,
  }
}

/** 从名册学生树提取班级下拉项，考生数由树节点 studentCount 提供。 */
function collectClassOptions(nodes: ExamClassStudentTreeNodeResponse[]): MarkClassOption[] {
  const result: MarkClassOption[] = []
  function walk(list: ExamClassStudentTreeNodeResponse[]) {
    for (const node of list) {
      if (node.nodeType === ExamClassStudentTreeNodeTypeCode.CLASS) {
        const count = node.studentCount ?? 0
        result.push({
          value: node.originalId,
          className: node.name,
          label: count > 0 ? `${node.name} · ${count} 名考生` : node.name,
          candidateCount: count,
        })
      }
      if (node.children?.length) {
        walk(node.children)
      }
    }
  }
  walk(nodes)
  return result.sort((a, b) => {
    const an = Number(a.value)
    const bn = Number(b.value)
    if (Number.isFinite(an) && Number.isFinite(bn)) {
      return an - bn
    }
    return a.value.localeCompare(b.value)
  })
}

export function useMarkExamRoster() {
  const classOptions = ref<MarkClassOption[]>([])
  const studentOptions = ref<MarkStudentOption[]>([])
  const loading = ref(false)
  const studentSearching = ref(false)
  const currentExamId = ref('')

  /** 按班级与关键词分页搜索在册学生，供下拉 remote 搜索。 */
  async function searchStudents(keyword?: string, classId?: string): Promise<void> {
    if (!currentExamId.value) {
      studentOptions.value = []
      return
    }
    studentSearching.value = true
    try {
      const page = await pageExamCandidates({
        examId: currentExamId.value,
        classId: classId?.trim() || undefined,
        keyword: keyword?.trim() || undefined,
        pageNum: 1,
        pageSize: ROSTER_STUDENT_PAGE_SIZE,
      })
      studentOptions.value = page.list.map(mapCandidateToStudentOption)
    } catch (e) {
      studentOptions.value = []
      showUserError(e, '考生搜索失败')
    } finally {
      studentSearching.value = false
    }
  }

  async function load(examId: string | undefined): Promise<void> {
    if (!examId) {
      currentExamId.value = ''
      classOptions.value = []
      studentOptions.value = []
      return
    }
    currentExamId.value = examId
    loading.value = true
    try {
      const tree = await listExamStudentTree({ examId })
      classOptions.value = collectClassOptions(tree)
      await searchStudents()
    } catch (e) {
      classOptions.value = []
      studentOptions.value = []
      showUserError(e, '考生名册加载失败')
    } finally {
      loading.value = false
    }
  }

  function reset(): void {
    currentExamId.value = ''
    classOptions.value = []
    studentOptions.value = []
  }

  return {
    classOptions,
    studentOptions,
    loading,
    studentSearching,
    load,
    searchStudents,
    reset,
  }
}
