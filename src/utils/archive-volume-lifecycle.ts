import type {
  ArchiveIntegrityStatusCode,
  ArchiveTransferStatusCode,
  ArchiveVolumeStatusCode
} from '@/apis/mark/archive-volume'
import { ArchiveAppraisalStatusCode, ArchiveDestructionStatusCode } from '@/apis/mark/archive-volume'

/** 归档卷全链路生命周期节点状态（lifecycle-pipe 展示用；卷主链须来自 navigationSummary.lifecycleNodes） */
export type ArchiveLifecycleStepStatus = 'done' | 'active' | 'pending' | 'warn'

export interface ArchiveLifecycleStep {
  key: string
  label: string
  status: ArchiveLifecycleStepStatus
}

/** 子链 / 向导等非卷主链 lifecycle-pipe 的本地步骤输入 */
export interface ArchiveVolumeLifecycleInput {
  volumeStatus: ArchiveVolumeStatusCode
  transferStatus: ArchiveTransferStatusCode
  integrityStatus: ArchiveIntegrityStatusCode
  appraisalStatus?: ArchiveAppraisalStatusCode
  destructionStatus?: ArchiveDestructionStatusCode
}

/** 已完成阶段数（done 节点计数；卷主链优先使用后端 completedLifecycleCount） */
export function countArchiveLifecycleDoneSteps(steps: ArchiveLifecycleStep[]): number {
  return steps.filter((step) => step.status === 'done').length
}

type AppraisalStepKey
  = | 'request'
    | 'approve'
    | 'opinion'
    | 'destruction-request'
    | 'destruction-approve'
    | 'destruction-execute'
    | 'supervise'

interface ArchiveLifecycleStepDefinition {
  key: string
  label: string
  description?: string
}

interface ArchiveLifecycleStepDescriptionDefinition {
  key: string
  label: string
  description: string
}

const APPRAISAL_STEP_DEFINITIONS: Array<ArchiveLifecycleStepDefinition & { key: AppraisalStepKey }> = [
  { key: 'request', label: '申请鉴定' },
  { key: 'approve', label: '鉴定审批' },
  { key: 'opinion', label: '记录鉴定决议' },
  { key: 'destruction-request', label: '申请销毁' },
  { key: 'destruction-approve', label: '销毁审批' },
  { key: 'destruction-execute', label: '执行销毁' },
  { key: 'supervise', label: '监销确认' },
]

function resolveAppraisalStepDone(
  stepKey: AppraisalStepKey,
  input: ArchiveVolumeLifecycleInput,
): boolean {
  const appraisalStatus = input.appraisalStatus ?? ArchiveAppraisalStatusCode.NOT_DUE
  const destructionStatus = input.destructionStatus ?? ArchiveDestructionStatusCode.NONE
  if (stepKey === 'request') {
    return appraisalStatus !== ArchiveAppraisalStatusCode.NOT_DUE
  }
  if (stepKey === 'approve') {
    return appraisalStatus === ArchiveAppraisalStatusCode.APPROVED
      || appraisalStatus === ArchiveAppraisalStatusCode.OPINION_RECORDED
  }
  if (stepKey === 'opinion') {
    return appraisalStatus === ArchiveAppraisalStatusCode.OPINION_RECORDED
  }
  if (stepKey === 'destruction-request') {
    return destructionStatus !== ArchiveDestructionStatusCode.NONE
  }
  if (stepKey === 'destruction-approve') {
    return (
      destructionStatus === ArchiveDestructionStatusCode.APPROVED
      || destructionStatus === ArchiveDestructionStatusCode.EXECUTING
      || destructionStatus === ArchiveDestructionStatusCode.EXECUTED
      || destructionStatus === ArchiveDestructionStatusCode.LEDGER_ARCHIVED
      || destructionStatus === ArchiveDestructionStatusCode.FAILED
    )
  }
  if (stepKey === 'destruction-execute') {
    return (
      destructionStatus === ArchiveDestructionStatusCode.EXECUTING
      || destructionStatus === ArchiveDestructionStatusCode.EXECUTED
      || destructionStatus === ArchiveDestructionStatusCode.LEDGER_ARCHIVED
    )
  }
  return (
    destructionStatus === ArchiveDestructionStatusCode.LEDGER_ARCHIVED
  )
}

/**
 * 鉴定 / 销毁子链 lifecycle-pipe，与详情鉴定 Panel 业务步骤同源。
 */
export function buildArchiveAppraisalLifecycleSteps(
  input: ArchiveVolumeLifecycleInput,
): ArchiveLifecycleStep[] {
  let activeIndex = APPRAISAL_STEP_DEFINITIONS.findIndex(
    (definition) => !resolveAppraisalStepDone(definition.key, input),
  )
  if (activeIndex < 0) {
    activeIndex = APPRAISAL_STEP_DEFINITIONS.length - 1
  }
  return APPRAISAL_STEP_DEFINITIONS.map((definition, index) => {
    let status: ArchiveLifecycleStepStatus
    if (index < activeIndex) {
      status = 'done'
    }
    else if (index === activeIndex) {
      if (
        definition.key === 'approve'
        && input.appraisalStatus === ArchiveAppraisalStatusCode.REJECTED
      ) {
        status = 'warn'
      }
      else if (
        definition.key === 'destruction-execute'
        && input.destructionStatus === ArchiveDestructionStatusCode.FAILED
      ) {
        status = 'warn'
      }
      else {
        status = resolveAppraisalStepDone(definition.key, input) ? 'done' : 'active'
      }
    }
    else {
      status = 'pending'
    }
    return {
      key: definition.key,
      label: definition.label,
      status,
    }
  })
}

type DestructionStepKey = 'request' | 'approve' | 'execute' | 'supervise'

const DESTRUCTION_STEP_DEFINITIONS: Array<ArchiveLifecycleStepDescriptionDefinition & { key: DestructionStepKey }> = [
  { key: 'request', label: '申请销毁', description: '保管期满或鉴定建议销毁后发起' },
  { key: 'approve', label: '审批销毁', description: '档案管理员审批，记录审批意见' },
  { key: 'execute', label: '执行销毁', description: '异步物理删除，支持重试 (L2-D3 两阶段)' },
  { key: 'supervise', label: '督办确认', description: '督导员确认销毁完成，写入销毁清册' },
]

function resolveDestructionStepDone(
  stepKey: DestructionStepKey,
  destructionStatus: ArchiveDestructionStatusCode,
): boolean {
  if (destructionStatus === ArchiveDestructionStatusCode.NONE) {
    return false
  }
  if (stepKey === 'request') {
    return true
  }
  if (stepKey === 'approve') {
    return (
      destructionStatus === ArchiveDestructionStatusCode.APPROVED
      || destructionStatus === ArchiveDestructionStatusCode.EXECUTING
      || destructionStatus === ArchiveDestructionStatusCode.EXECUTED
      || destructionStatus === ArchiveDestructionStatusCode.LEDGER_ARCHIVED
      || destructionStatus === ArchiveDestructionStatusCode.FAILED
    )
  }
  if (stepKey === 'execute') {
    return (
      destructionStatus === ArchiveDestructionStatusCode.EXECUTING
      || destructionStatus === ArchiveDestructionStatusCode.EXECUTED
      || destructionStatus === ArchiveDestructionStatusCode.LEDGER_ARCHIVED
    )
  }
  return destructionStatus === ArchiveDestructionStatusCode.LEDGER_ARCHIVED
}

/** 销毁子链 lifecycle-pipe，与鉴定 Panel 销毁区步骤同源。 */
export function buildArchiveDestructionLifecycleSteps(
  destructionStatus: ArchiveDestructionStatusCode = ArchiveDestructionStatusCode.NONE,
): ArchiveLifecycleStep[] {
  if (destructionStatus === ArchiveDestructionStatusCode.NONE) {
    const pendingStatus: ArchiveLifecycleStepStatus = 'pending'
    return DESTRUCTION_STEP_DEFINITIONS.map((definition) => ({
      key: definition.key,
      label: definition.label,
      status: pendingStatus,
    }))
  }
  let activeIndex = DESTRUCTION_STEP_DEFINITIONS.findIndex(
    (definition) => !resolveDestructionStepDone(definition.key, destructionStatus),
  )
  if (activeIndex < 0) {
    activeIndex = DESTRUCTION_STEP_DEFINITIONS.length - 1
  }
  return DESTRUCTION_STEP_DEFINITIONS.map((definition, index) => {
    let status: ArchiveLifecycleStepStatus
    if (index < activeIndex) {
      status = 'done'
    }
    else if (index === activeIndex) {
      if (definition.key === 'execute' && destructionStatus === ArchiveDestructionStatusCode.FAILED) {
        status = 'warn'
      }
      else if (
        definition.key === 'approve'
        && destructionStatus === ArchiveDestructionStatusCode.REJECTED
      ) {
        status = 'warn'
      }
      else {
        status = resolveDestructionStepDone(definition.key, destructionStatus) ? 'done' : 'active'
      }
    }
    else {
      status = 'pending'
    }
    return {
      key: definition.key,
      label: definition.label,
      status,
    }
  })
}

export function getArchiveDestructionStepDescriptions(): ReadonlyArray<{
  key: string
  label: string
  description: string
}> {
  return DESTRUCTION_STEP_DEFINITIONS
}

export interface ArchiveExamGateLifecycleInput {
  gateOpen?: boolean
  volumeCreated?: boolean
  collecting?: boolean
  submitted?: boolean
}

const EXAM_GATE_STEP_DEFINITIONS: ArchiveLifecycleStepDefinition[] = [
  { key: 'gate', label: '成绩发布 + 关考' },
  { key: 'auto-create', label: '自动创建归档任务' },
  { key: 'collecting', label: '材料收集' },
  { key: 'submit', label: '提交归档' },
]

/** 考试工作台归档进度 lifecycle-pipe */
export function buildArchiveExamGateLifecycleSteps(
  input: ArchiveExamGateLifecycleInput,
): ArchiveLifecycleStep[] {
  const doneFlags = [
    Boolean(input.gateOpen),
    Boolean(input.volumeCreated),
    Boolean(input.collecting),
    Boolean(input.submitted),
  ]
  let activeIndex = doneFlags.findIndex((done) => !done)
  if (activeIndex < 0) {
    activeIndex = doneFlags.length - 1
  }
  return EXAM_GATE_STEP_DEFINITIONS.map((definition, index) => {
    let status: ArchiveLifecycleStepStatus
    if (index < activeIndex) {
      status = 'done'
    }
    else if (index === activeIndex) {
      status = doneFlags[index] ? 'done' : 'active'
    }
    else {
      status = 'pending'
    }
    return {
      key: definition.key,
      label: definition.label,
      status,
    }
  })
}

const OFFLINE_CREATE_STEP_DEFINITIONS: ArchiveLifecycleStepDefinition[] = [
  { key: 'archive-create-basic', label: '基本信息' },
  { key: 'archive-create-config', label: '归档配置' },
  { key: 'archive-create-confirm', label: '确认创建' },
]

/** 线下纯归档建卷向导 lifecycle-pipe */
export function buildArchiveOfflineCreateLifecycleSteps(
  activeSection: string,
): ArchiveLifecycleStep[] {
  const activeIndex = OFFLINE_CREATE_STEP_DEFINITIONS.findIndex(
    (definition) => definition.key === activeSection,
  )
  const resolvedIndex = activeIndex < 0 ? 0 : activeIndex
  return OFFLINE_CREATE_STEP_DEFINITIONS.map((definition, index) => {
    let status: ArchiveLifecycleStepStatus
    if (index < resolvedIndex) {
      status = 'done'
    }
    else if (index === resolvedIndex) {
      status = 'active'
    }
    else {
      status = 'pending'
    }
    return {
      key: definition.key,
      label: definition.label,
      status,
    }
  })
}
