/**
 * 试评 / 正评会话列表的筛选、分页与空态契约。
 * 读取面（进度页）与操作面（会话工作台）共用，避免双轨维护。
 */
import type { SessionListQueryRequest } from '@/apis/mark/marking-organization'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { FormalSessionStatusCode } from '@/types/enums/formal-session-status-enum'
import type { TrialSessionStatusCode } from '@/types/enums/trial-session-status-enum'
import {
  ALL_FORMAL_SESSION_STATUS_CODES,
  FormalSessionStatusDescription,
} from '@/types/enums/formal-session-status-enum'
import {
  ALL_TRIAL_SESSION_STATUS_CODES,
  TrialSessionStatusDescription,
} from '@/types/enums/trial-session-status-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

export type MarkingSessionListPhase = 'trial' | 'formal'

export interface MarkingSessionFilterModel {
  keyword: string
  status?: TrialSessionStatusCode | FormalSessionStatusCode
  groupId?: string
}

export interface MarkingSessionGroupOption {
  value: string
  label: string
}

/**
 * 服务端分页刷新后校正页码：总条数变少时回落到最后一页。
 */
export function resolveSessionPageAfterReload(
  requestedPageNum: number,
  pageSize: number,
  total: number,
): number {
  if (total <= 0) {
    return 1
  }
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (requestedPageNum > totalPages) {
    return totalPages
  }
  return requestedPageNum
}

/** 是否存在生效中的关键词 / 状态 / 题组筛选 */
export function hasActiveSessionFilter(model: MarkingSessionFilterModel): boolean {
  return Boolean(model.keyword.trim()) || Boolean(model.status) || Boolean(model.groupId)
}

/** 试评 / 正评状态下拉选项（完整枚举，禁止宽化） */
export function resolveSessionStatusFilterOptions(
  phase: MarkingSessionListPhase,
): Array<{ value: string, label: string }> {
  if (phase === 'trial') {
    return ALL_TRIAL_SESSION_STATUS_CODES.map((status) => ({
      value: status,
      label: strictEnumLabel(TrialSessionStatusDescription, status, '试评会话状态'),
    }))
  }
  return ALL_FORMAL_SESSION_STATUS_CODES.map((status) => ({
    value: status,
    label: strictEnumLabel(FormalSessionStatusDescription, status, '正评会话状态'),
  }))
}

/** 会话列表 FilterBar 字段：读取面与操作面字段键一致 */
export function buildMarkingSessionFilterFields(
  phase: MarkingSessionListPhase,
  groupOptions: MarkingSessionGroupOption[],
): FilterField[] {
  return [
    {
      key: 'keyword',
      type: 'input',
      inputPrefixIcon: 'search',
      placeholder: phase === 'trial' ? '搜索题组、状态、校准结论' : '搜索题组、状态',
      width: 260,
      triggerSearchOnChange: false,
    },
    {
      key: 'status',
      type: 'select',
      placeholder: '全部状态',
      options: resolveSessionStatusFilterOptions(phase),
      width: 140,
      triggerSearchOnChange: false,
    },
    {
      key: 'groupId',
      type: 'select',
      placeholder: '全部题组',
      options: groupOptions.map((item) => ({ label: item.label, value: item.value })),
      width: 160,
      triggerSearchOnChange: false,
    },
  ]
}

/**
 * 会话表空态文案：失败 / 无匹配 / 真无会话 三分；
 * createHint 仅操作面传入（可创建引导或创建阻断时空串）。
 */
export function resolveSessionTableEmptyDescription(options: {
  phase: MarkingSessionListPhase
  loadFailed: boolean
  total: number
  filter: MarkingSessionFilterModel
  createHint?: string
}): string {
  if (options.loadFailed) {
    return options.phase === 'trial' ? '试评会话列表加载失败' : '正评会话列表加载失败'
  }
  if (options.total === 0 && hasActiveSessionFilter(options.filter)) {
    return '未找到匹配会话，请调整筛选条件'
  }
  if (options.total === 0 && options.createHint !== undefined) {
    return options.createHint
  }
  return options.phase === 'trial' ? '暂无试评会话' : '暂无正评会话'
}

/** 将 FilterBar 提交模型解析为正式筛选合同 */
export function parseSessionFilterModel(
  phase: MarkingSessionListPhase,
  model: Record<string, unknown>,
): MarkingSessionFilterModel {
  let status: TrialSessionStatusCode | FormalSessionStatusCode | undefined
  const rawStatus = model.status
  if (typeof rawStatus === 'string' && rawStatus) {
    if (phase === 'trial') {
      for (const code of ALL_TRIAL_SESSION_STATUS_CODES) {
        if (code === rawStatus) {
          status = code
          break
        }
      }
    } else {
      for (const code of ALL_FORMAL_SESSION_STATUS_CODES) {
        if (code === rawStatus) {
          status = code
          break
        }
      }
    }
  }
  return {
    keyword: String(model.keyword ?? '').trim(),
    status,
    groupId: model.groupId ? String(model.groupId) : undefined,
  }
}

/** 把筛选合同写入会话分页查询（不覆盖 organizationId / page） */
export function applySessionFilterToListQuery(
  query: SessionListQueryRequest,
  phase: MarkingSessionListPhase,
  filter: MarkingSessionFilterModel,
): void {
  const keyword = filter.keyword.trim()
  if (keyword) {
    query.keyword = keyword
  }
  if (filter.groupId) {
    query.groupId = filter.groupId
  }
  if (phase === 'trial' && filter.status) {
    for (const code of ALL_TRIAL_SESSION_STATUS_CODES) {
      if (code === filter.status) {
        query.trialSessionStatus = code
        break
      }
    }
  }
  if (phase === 'formal' && filter.status) {
    for (const code of ALL_FORMAL_SESSION_STATUS_CODES) {
      if (code === filter.status) {
        query.formalSessionStatus = code
        break
      }
    }
  }
}
