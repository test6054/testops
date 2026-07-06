#!/usr/bin/env node
/**
 * 校验 AnalysisExamMultiSelect 自动勾选策略（与 useCrossExamDefaultScope 保持一致）。
 */
function hasExamOccurrenceScope(input) {
  return Boolean(input.scopeAcademicYear?.trim() && input.scopeSemester)
}

function hasTeachingScope(input) {
  return Boolean(input.scopeTeachingAcademicYear?.trim() && input.scopeTeachingSemester)
}

function shouldAutoSelectAnalysisExams(input) {
  if (input.defaultRecentSemesterCount > 0) {
    return true
  }
  if (input.autoSelectLargestCourseClusterInScope && (hasExamOccurrenceScope(input) || hasTeachingScope(input))) {
    return true
  }
  if (input.autoSelectScopedExams && (hasExamOccurrenceScope(input) || hasTeachingScope(input))) {
    return true
  }
  return false
}

/** 与 pickExamIdsByLargestCourseCluster 保持一致 */
function pickExamIdsByLargestCourseCluster(exams) {
  if (exams.length === 0) {
    return []
  }
  const examsByCourseId = new Map()
  for (const exam of exams) {
    const courseId = exam.courseId?.trim()
    if (!courseId) {
      continue
    }
    const courseExams = examsByCourseId.get(courseId) ?? []
    courseExams.push(exam)
    examsByCourseId.set(courseId, courseExams)
  }
  if (examsByCourseId.size === 0) {
    return []
  }
  let selectedCourseId = ''
  let selectedExams = []
  for (const [courseId, courseExams] of examsByCourseId) {
    if (courseExams.length > selectedExams.length) {
      selectedCourseId = courseId
      selectedExams = courseExams
      continue
    }
    if (courseExams.length === selectedExams.length && courseId.localeCompare(selectedCourseId) > 0) {
      selectedCourseId = courseId
      selectedExams = courseExams
    }
  }
  return selectedExams.map((exam) => exam.examId)
}

const autoSelectCases = [
  {
    name: 'scope + autoSelectScopedExams（校级质量 / 课程达成度 OBE）',
    input: {
      scopeAcademicYear: '2024-2025',
      scopeSemester: '1',
      defaultRecentSemesterCount: 0,
      autoSelectScopedExams: true,
    },
    expected: true,
  },
  {
    name: '仅 scope 过滤无 autoSelect，不自动全选',
    input: {
      scopeAcademicYear: '2024-2025',
      scopeSemester: '1',
      defaultRecentSemesterCount: 0,
      autoSelectScopedExams: false,
    },
    expected: false,
  },
  {
    name: '开课学期 scope + autoSelectScopedExams',
    input: {
      scopeTeachingAcademicYear: '2024-2025',
      scopeTeachingSemester: '1',
      defaultRecentSemesterCount: 0,
      autoSelectScopedExams: true,
    },
    expected: true,
  },
  {
    name: 'defaultRecentSemesterCount 仍自动全选（跨考趋势）',
    input: { defaultRecentSemesterCount: 2, autoSelectScopedExams: false },
    expected: true,
  },
  {
    name: '无 scope 无 recent 不自动全选',
    input: { defaultRecentSemesterCount: 0, autoSelectScopedExams: false },
    expected: false,
  },
  {
    name: 'autoSelectScopedExams 但无 scope 不自动全选',
    input: { defaultRecentSemesterCount: 0, autoSelectScopedExams: true },
    expected: false,
  },
  {
    name: 'scope + autoSelectLargestCourseClusterInScope（跨考趋势同学期）',
    input: {
      scopeAcademicYear: '2024-2025',
      scopeSemester: '1',
      defaultRecentSemesterCount: 0,
      autoSelectScopedExams: false,
      autoSelectLargestCourseClusterInScope: true,
    },
    expected: true,
  },
  {
    name: 'autoSelectLargestCourseClusterInScope 但无 scope 不自动全选',
    input: {
      defaultRecentSemesterCount: 0,
      autoSelectScopedExams: false,
      autoSelectLargestCourseClusterInScope: true,
    },
    expected: false,
  },
]

const clusterCases = [
  {
    name: '跨课程仅选最大簇',
    exams: [
      { examId: '1', courseId: 'c-math' },
      { examId: '2', courseId: 'c-math' },
      { examId: '3', courseId: 'c-eng' },
    ],
    expected: ['1', '2'],
  },
  {
    name: '并列簇按 courseId 字典序取较大者',
    exams: [
      { examId: '1', courseId: 'c-a' },
      { examId: '2', courseId: 'c-b' },
    ],
    expected: ['2'],
  },
  {
    name: '无 courseId 返回空',
    exams: [{ examId: '1' }],
    expected: [],
  },
  {
    name: '最大簇仅 1 场时不预填（跨考趋势须≥2）',
    exams: [
      { examId: '1', courseId: 'c-math' },
      { examId: '2', courseId: 'c-eng' },
    ],
    minCount: 2,
    expected: [],
  },
]

let failed = 0
for (const item of autoSelectCases) {
  const actual = shouldAutoSelectAnalysisExams(item.input)
  if (actual !== item.expected) {
    failed += 1
    console.error(`FAIL: ${item.name} — expected ${item.expected}, got ${actual}`)
  }
}

for (const item of clusterCases) {
  const actual = pickExamIdsByLargestCourseCluster(item.exams)
  const minCount = item.minCount ?? 1
  const resolved = actual.length >= minCount ? actual : []
  const same = resolved.length === item.expected.length
    && resolved.every((id, index) => id === item.expected[index])
  if (!same) {
    failed += 1
    console.error(`FAIL: ${item.name} — expected ${JSON.stringify(item.expected)}, got ${JSON.stringify(resolved)}`)
  }
}

if (failed > 0) {
  console.error(`verify-analysis-exam-auto-select: ${failed} case(s) failed`)
  process.exit(1)
}

console.warn(`verify-analysis-exam-auto-select: ${autoSelectCases.length + clusterCases.length} case(s) passed`)
