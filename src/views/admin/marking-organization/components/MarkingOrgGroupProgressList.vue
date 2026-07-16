<template>
  <WorkbenchSurfaceCard flush class="org-group-progress">
    <template #head>
      <div class="org-group-progress__head">
        <h3 class="org-group-progress__title">阅卷题组</h3>
        <span class="org-group-progress__hint">共 {{ groups.length }} 个题组</span>
      </div>
    </template>

    <UiEmpty v-if="groups.length === 0" description="暂无题组" />

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
          <span>任务 {{ progressOf(group.id).finalized }}/{{ progressOf(group.id).total }}</span>
        </div>
        <div class="org-group-progress__bar-row">
          <div class="org-group-progress__bar">
            <div
              class="org-group-progress__bar-fill"
              :style="{
                transform: `scaleX(${Math.max(0, Math.min(1, progressPercent(group.id) / 100))})`,
              }"
            />
          </div>
          <span class="org-group-progress__percent">{{ progressPercent(group.id) }}%</span>
        </div>
        <div
          v-if="canManage && group.groupStatus !== QuestionMarkingGroupStatusCode.GROUP_CLOSED"
          class="org-group-progress__actions"
        >
          <UiButton variant="ghost" size="sm" @click="emit('edit-group', group.id)">编辑</UiButton>
        </div>
      </li>
    </ul>
  </WorkbenchSurfaceCard>
</template>

<script lang="ts" setup>
import type { QuestionMarkingGroupResponse } from '@/apis/mark/marking-organization'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import {
  QUESTION_GROUP_STATUS_TONE,
  QuestionMarkingGroupStatusDescription,
} from '@/apis/mark/marking-organization'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { QuestionMarkingGroupStatusCode } from '@/types/enums/question-marking-group-status-enum'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'MarkingOrgGroupProgressList' })

const props = defineProps<{
  groups: QuestionMarkingGroupResponse[]
  groupProgressById: Record<string, GroupProgressSnapshot>
  canManage: boolean
}>()

const emit = defineEmits<{
  'edit-group': [groupId: string]
}>()

export interface GroupProgressSnapshot {
  total: number
  finalized: number
}

function progressOf(groupId: string): GroupProgressSnapshot {
  return props.groupProgressById[groupId] ?? { total: 0, finalized: 0 }
}

function progressPercent(groupId: string): number {
  const snapshot = progressOf(groupId)
  if (snapshot.total <= 0) return 0
  return Math.round((snapshot.finalized * 100) / snapshot.total)
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
    gap: var(--dp-space-2);
    width: 100%;
  }

  &__title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  &__hint {
    font-size: 12px;
    color: var(--dp-text-muted);
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-2);
    margin: 0;
    padding: var(--dp-space-3);
    list-style: none;
  }

  &__item {
    border: 1px solid var(--dp-border);
    border-radius: 6px;
    padding: 12px;
    background: var(--dp-surface);
  }

  &__item-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-2);
    margin-bottom: 8px;
  }

  &__item-title {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
  }

  &__leader {
    flex-shrink: 0;
    font-size: 12px;
    color: var(--dp-text-muted);
  }

  &__meta {
    display: flex;
    gap: 16px;
    margin-bottom: 8px;
    font-size: 12px;
    color: var(--dp-text-secondary);
  }

  &__bar-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__bar {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: var(--dp-surface-sunken);
    overflow: hidden;
  }

  &__bar-fill {
    height: 100%;
    width: 100%;
    transform-origin: left center;
    border-radius: 2px;
    background: var(--dp-color-primary);
    transition: transform 0.2s ease;
  }

  &__percent {
    min-width: 36px;
    font-size: 12px;
    font-weight: 600;
    text-align: right;
  }

  &__actions {
    margin-top: 8px;
  }
}
</style>
