<template>
  <WorkbenchSurfaceCard flush class="org-group-progress">
    <template #head>
      <div class="org-group-progress__head">
        <h3 class="org-group-progress__title">阅卷题组</h3>
        <span class="org-group-progress__hint">共 {{ groups.length }} 个题组</span>
      </div>
    </template>

    <UiAlertStrip
      v-if="progressLoadFailed"
      tone="error"
      dense
      title="题组任务进度加载失败"
      class="org-group-progress__alert"
    />

    <UiEmpty size="sm" v-if="groups.length === 0" description="暂无题组" />

    <ul v-else class="org-group-progress__list">
      <li v-for="group in groups" :key="group.id" class="org-group-progress__item">
        <div class="org-group-progress__item-head">
          <div class="org-group-progress__item-title">
            <span class="org-group-progress__name">{{ group.groupName }}</span>
            <UiTag :tone="groupStatusTone(group.groupStatus)" size="sm">
              {{ groupStatusLabel(group.groupStatus) }}
            </UiTag>
          </div>
          <span class="org-group-progress__leader">组长 {{ group.leaderUserName }}</span>
        </div>
        <div class="org-group-progress__meta">
          <span>{{ group.questions.length || '整卷' }} 题</span>
          <span>{{ group.reviewers.length }} 人</span>
          <span>任务 {{ progressRatioLabel(group.id) }}</span>
        </div>
        <div class="org-group-progress__bar-row">
          <div class="org-group-progress__bar">
            <div
              class="org-group-progress__bar-fill"
              :style="{
                transform: `scaleX(${progressBarScale(group.id)})`,
              }"
            />
          </div>
          <span class="org-group-progress__percent">{{ progressPercentLabel(group.id) }}</span>
        </div>
        <div
          v-if="group.canEditQuestionGroup"
          class="org-group-progress__actions"
        >
          <!-- MVR-407：仅认 BE canEditQuestionGroup===true；禁止仅认非 CLOSED 假可编辑 -->
          <UiButton variant="ghost" size="sm" @click="emit('edit-group', group.id)">编辑</UiButton>
        </div>
      </li>
    </ul>
  </WorkbenchSurfaceCard>
</template>

<script lang="ts" setup>
import type { QuestionMarkingGroupResponse } from '@/apis/mark/marking-organization'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { QuestionMarkingGroupStatusCode } from '@/types/enums/question-marking-group-status-enum'
import {
  QUESTION_GROUP_STATUS_TONE,
  QuestionMarkingGroupStatusDescription,
} from '@/apis/mark/marking-organization'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import {
  formatTaskProgressRatio,
  resolveTaskProgressPercent,
} from '@/utils/session-task-progress'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'MarkingOrgGroupProgressList' })

const props = defineProps<{
  groups: QuestionMarkingGroupResponse[]
  groupProgressById: Record<string, GroupProgressSnapshot>
  canManage: boolean
  /** 题组进度请求失败：禁止用 0/0 伪装尚未形成 */
  progressLoadFailed?: boolean
}>()

const emit = defineEmits<{
  'edit-group': [groupId: string]
}>()

export interface GroupProgressSnapshot {
  total: number
  finalized: number
}

function progressOf(groupId: string): GroupProgressSnapshot | null {
  if (props.progressLoadFailed) {
    return null
  }
  return props.groupProgressById[groupId] ?? null
}

function progressRatioLabel(groupId: string): string {
  const snapshot = progressOf(groupId)
  if (!snapshot) {
    return '—'
  }
  return formatTaskProgressRatio(snapshot.total, snapshot.finalized)
}

function progressPercentLabel(groupId: string): string {
  const snapshot = progressOf(groupId)
  if (!snapshot) {
    return '—'
  }
  const percent = resolveTaskProgressPercent(snapshot.total, snapshot.finalized)
  return percent == null ? '—' : `${percent}%`
}

function progressBarScale(groupId: string): number {
  const snapshot = progressOf(groupId)
  if (!snapshot) {
    return 0
  }
  const percent = resolveTaskProgressPercent(snapshot.total, snapshot.finalized)
  if (percent == null) {
    return 0
  }
  return Math.max(0, Math.min(1, percent / 100))
}

function groupStatusTone(status: QuestionMarkingGroupStatusCode): BadgeTone {
  return strictEnumTone(QUESTION_GROUP_STATUS_TONE, status, '题组状态')
}

function groupStatusLabel(status: QuestionMarkingGroupStatusCode): string {
  return strictEnumLabel(QuestionMarkingGroupStatusDescription, status, '题组状态')
}
</script>

<style lang="scss" scoped>
.org-group-progress {
  &__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--dp-space-component-tight);
    width: 100%;
  }

  &__title {
    margin: 0;
    font-size: var(--dp-font-size-sm);
    font-weight: 600;
  }

  &__hint {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
  }

  &__alert {
    margin: var(--dp-space-component-tight) var(--dp-space-component) 0;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component-tight);
    margin: 0;
    padding: var(--dp-space-component-tight) var(--dp-space-component);
    list-style: none;
  }

  &__item {
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-xs);
    padding: var(--dp-space-component-tight) var(--dp-space-component);
    background: var(--dp-surface);
  }

  &__item-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-component-tight);
    margin-bottom: var(--dp-space-component-tight);
  }

  &__item-title {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    min-width: 0;
  }

  &__name {
    font-size: var(--dp-font-size-sm);
    font-weight: 600;
  }

  &__leader {
    flex-shrink: 0;
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
  }

  &__meta {
    display: flex;
    gap: var(--dp-space-component);
    margin-bottom: var(--dp-space-component-tight);
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-secondary);
  }

  &__bar-row {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
  }

  &__bar {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: var(--dp-bg-muted);
    overflow: hidden;
  }

  &__bar-fill {
    height: 100%;
    width: 100%;
    transform-origin: left center;
    border-radius: 2px;
    background: var(--dp-color-primary);
    transition: transform var(--dp-duration-normal) var(--dp-ease-default);
  }

  &__percent {
    min-width: 36px;
    font-size: var(--dp-font-size-xs);
    font-weight: 600;
    text-align: right;
  }

  &__actions {
    margin-top: var(--dp-space-component-tight);
  }
}
</style>
