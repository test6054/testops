import type { FilterField } from '@/components/ui-guide/ui/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { formatSemester, SemesterOptions } from '@/types/enums/semester-enum'
import {
  composeAcademicYear,
  generateAcademicYearStartOptions,
  getDefaultAcademicYearAndSemester,
  parseAcademicYearStart,
} from '@/utils/academic-year'
import {
  buildOptionalAcademicYearSemesterQuery,
  ensureAcademicYearSemesterPair,
} from '@/utils/academic-year-semester-query'

/** 学年学期三字段筛选态：学年起始年、学年结束年（只读）、学期枚举。归档历史：双空=全量；禁止半填。 */
export interface AcademicYearSemesterTripleFilterState {
  academicYearStartYear: number | undefined
  academicYearEndYear: number | undefined
  semester: SemesterCode | undefined
}

/** 初始化三字段默认值；useCurrentTerm=true 时默认当前学年学期，仍可清空回全量。 */
export function createAcademicYearSemesterTripleDefaults(
  useCurrentTerm = true,
): AcademicYearSemesterTripleFilterState {
  if (!useCurrentTerm) {
    return {
      academicYearStartYear: undefined,
      academicYearEndYear: undefined,
      semester: undefined,
    }
  }
  const defaultTerm = getDefaultAcademicYearAndSemester()
  const defaultStart = parseAcademicYearStart(defaultTerm.academicYear)
  return {
    academicYearStartYear: defaultStart ?? undefined,
    academicYearEndYear: defaultStart != null ? defaultStart + 1 : undefined,
    semester: defaultTerm.semester,
  }
}

/** 从 YYYY-YYYY 合同与学期还原三字段态。 */
export function parseTripleFromAcademicYear(
  academicYear?: string | null,
  semester?: SemesterCode | null,
): AcademicYearSemesterTripleFilterState {
  const start = academicYear?.trim() ? parseAcademicYearStart(academicYear.trim()) : null
  return {
    academicYearStartYear: start ?? undefined,
    academicYearEndYear: start != null ? start + 1 : undefined,
    semester: semester ?? undefined,
  }
}

/** 由学年起始年合成后端 YYYY-YYYY 合同。 */
export function resolveAcademicYearFromTriple(
  state: Pick<AcademicYearSemesterTripleFilterState, 'academicYearStartYear'>,
): string | undefined {
  return state.academicYearStartYear != null
    ? composeAcademicYear(state.academicYearStartYear)
    : undefined
}

/** 构造可选学年学期 API 查询；单填返回 null。 */
export function buildTriplePeriodQuery(state: AcademicYearSemesterTripleFilterState) {
  return buildOptionalAcademicYearSemesterQuery(
    resolveAcademicYearFromTriple(state),
    state.semester,
  )
}

/** 校验学年学期成对。 */
export function ensureTriplePeriodPair(state: AcademicYearSemesterTripleFilterState): boolean {
  return ensureAcademicYearSemesterPair(resolveAcademicYearFromTriple(state), state.semester)
}

/** UiFilterBar 三字段定义。 */
export function buildAcademicYearSemesterTripleFilterFields(): FilterField[] {
  const startOptions = generateAcademicYearStartOptions().map((year) => ({
    label: `${year} 年`,
    value: year,
  }))
  const semesterOptions = SemesterOptions.map((item) => ({
    label: formatSemester(item.value),
    value: item.value,
  }))
  return [
    {
      key: 'academicYearStartYear',
      label: '学年起始年',
      type: 'select',
      placeholder: '全部（不限）',
      options: startOptions,
      allowClear: true,
    },
    {
      key: 'academicYearEndYear',
      label: '学年结束年',
      type: 'input',
      placeholder: '结束年',
      disabled: true,
    },
    {
      key: 'semester',
      label: '学期',
      type: 'select',
      placeholder: '全部（不限）',
      options: semesterOptions,
      allowClear: true,
    },
  ]
}

/** 清空为历史全量（双空）。 */
export function clearAcademicYearSemesterTripleToFullScope(
  state: AcademicYearSemesterTripleFilterState,
): void {
  state.academicYearStartYear = undefined
  state.academicYearEndYear = undefined
  state.semester = undefined
}

/**
 * 学年起始年变更：同步结束年；清空起始年时两侧同清为全量。
 * 换年时保留学期编码，减少二次点击。
 */
export function applyAcademicYearStartYearChange(
  state: AcademicYearSemesterTripleFilterState,
  startYear: number | undefined | null,
): void {
  if (startYear == null) {
    clearAcademicYearSemesterTripleToFullScope(state)
    return
  }
  state.academicYearStartYear = startYear
  state.academicYearEndYear = startYear + 1
}

/**
 * 学期变更：清空学期时两侧同清为全量，禁止半填。
 */
export function applyTripleSemesterChange(
  state: AcademicYearSemesterTripleFilterState,
  semester: SemesterCode | undefined | null,
): void {
  if (semester == null) {
    clearAcademicYearSemesterTripleToFullScope(state)
    return
  }
  state.semester = semester
}

/** 重置三字段为默认当前学年学期。 */
export function resetAcademicYearSemesterTriple(
  state: AcademicYearSemesterTripleFilterState,
  useCurrentTerm = true,
): void {
  Object.assign(state, createAcademicYearSemesterTripleDefaults(useCurrentTerm))
}
