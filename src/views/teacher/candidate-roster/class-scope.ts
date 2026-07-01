import type { ExamClassRefVO } from '@/apis/mark/exam'

export interface ClassSelectOption {
  label: string
  value: string
}

export interface ScopedClassTag {
  classId: string
  className: string
}

export function mergeClassSelectOptions(
  refs: ExamClassRefVO[],
  apiOptions: ClassSelectOption[],
): ClassSelectOption[] {
  const map = new Map<string, ClassSelectOption>()
  for (const opt of apiOptions) {
    map.set(opt.value, opt)
  }
  for (const ref of refs) {
    if (!ref.classId || !ref.className) {
      continue
    }
    if (!map.has(ref.classId)) {
      map.set(ref.classId, { value: ref.classId, label: ref.className })
    }
  }
  return Array.from(map.values()).sort((left, right) =>
    left.label.localeCompare(right.label, 'zh-CN'),
  )
}

export function buildScopedClassTags(
  classIds: string[],
  refs: ExamClassRefVO[],
  options: ClassSelectOption[],
): ScopedClassTag[] {
  const labelMap = new Map<string, string>()
  for (const ref of refs) {
    if (ref.classId && ref.className) {
      labelMap.set(ref.classId, ref.className)
    }
  }
  for (const opt of options) {
    labelMap.set(opt.value, opt.label)
  }
  const seen = new Set<string>()
  const tags: ScopedClassTag[] = []
  for (const classId of classIds) {
    if (seen.has(classId)) {
      continue
    }
    seen.add(classId)
    tags.push({
      classId,
      className: labelMap.get(classId) ?? classId,
    })
  }
  return tags
}
