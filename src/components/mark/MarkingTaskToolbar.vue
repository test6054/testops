<template>
  <div class="marking-task-toolbar">
    <div class="marking-task-toolbar__main">
      <UiButton variant="outline" size="sm" @click="navigation.goBackToTaskPool">
        <template #icon><LeftOutlined /></template>
        返回任务池
      </UiButton>
      <UiTag v-if="task" :tone="taskStatusTone(task.taskStatus)" size="sm">
        {{ taskStatusLabel(task.taskStatus) }}
      </UiTag>
      <UiTag v-if="task?.dualMarkRole" tone="blue" size="sm">
        双评·{{ dualMarkRoleLabel(task.dualMarkRole) }}
      </UiTag>
      <UiTag
        v-if="task?.dualMarkRole && task.taskStatus === MarkingTaskStatusCode.FINALIZED && !task.dualMarkFormalGradeStatus"
        tone="orange"
        size="sm"
      >
        等待对端
      </UiTag>
      <UiTag
        v-else-if="task?.dualMarkFormalGradeStatus === GradeStatusCode.NEED_REVIEW"
        tone="orange"
        size="sm"
      >
        已进仲裁
      </UiTag>
      <UiTag
        v-else-if="task?.dualMarkFormalGradeStatus === GradeStatusCode.CONFIRMED"
        tone="green"
        size="sm"
      >
        双评已合成
      </UiTag>
      <template v-if="task?.anonymousToken && !revealedIdentity">
        <UiTooltip
          v-if="canManageOwnerIdentityReveal !== true"
          title="当前为匿名阅卷模式，仅考试主考老师可解匿名查看学生身份"
        >
          <UiTag tone="blue" size="sm">匿名保护中</UiTag>
        </UiTooltip>
        <UiTag v-else tone="blue" size="sm">匿名保护中</UiTag>
      </template>
      <UiPopoverPanel
        v-if="task"
        title="任务摘要"
        :trigger="['click']"
        placement="bottomLeft"
        :max-width="320"
        compact
      >
        <UiButton variant="outline" size="sm">
          <template #icon><InfoCircleOutlined /></template>
          任务摘要
        </UiButton>
        <template #content>
          <dl class="marking-task-toolbar__summary-list">
            <div class="marking-task-toolbar__summary-item">
              <dt>匿名模式</dt>
              <dd>{{ anonymityModeLabel(task.anonymityMode) }}</dd>
            </div>
            <div class="marking-task-toolbar__summary-item">
              <dt>批阅单元</dt>
              <dd>{{ allocationUnitLabel(task.taskUnit) }}</dd>
            </div>
            <div v-if="task.dualMarkRole" class="marking-task-toolbar__summary-item">
              <dt>双评角色</dt>
              <dd>{{ dualMarkRoleLabel(task.dualMarkRole) }}</dd>
            </div>
            <div v-if="task.dualMarkPeerTaskStatus" class="marking-task-toolbar__summary-item">
              <dt>对端状态</dt>
              <dd>{{ taskStatusLabel(task.dualMarkPeerTaskStatus) }}</dd>
            </div>
            <div class="marking-task-toolbar__summary-item">
              <dt>答卷</dt>
              <dd>{{ task.paperDisplay.primaryText }}</dd>
            </div>
            <div v-if="task.paperDisplay.secondaryText" class="marking-task-toolbar__summary-item">
              <dt>答卷补充</dt>
              <dd>{{ task.paperDisplay.secondaryText }}</dd>
            </div>
            <div v-if="isReadOnly === true" class="marking-task-toolbar__summary-item">
              <dt>查看模式</dt>
              <dd>已定稿 · 只读查看</dd>
            </div>
            <div v-if="revealedIdentity" class="marking-task-toolbar__summary-item">
              <dt>解匿名身份</dt>
              <dd>{{ revealedIdentity.studentName }}（{{ revealedIdentity.studentNo }}）</dd>
            </div>
          </dl>
        </template>
        <template v-if="task.anonymousToken && !revealedIdentity && canManageOwnerIdentityReveal === true" #footer>
          <UiButton size="sm" variant="outline" @click="emit('reveal')">
            <template #icon><UnlockOutlined /></template>
            解匿名
          </UiButton>
        </template>
      </UiPopoverPanel>
    </div>
    <div class="marking-task-toolbar__actions">
      <template v-if="batchProgress && !hideBatchNav">
        <UiButton
          size="sm"
          variant="outline"
          :disabled="!prevTaskId"
          @click="navigation.goToTask(prevTaskId)"
        >
          <template #icon><LeftOutlined /></template>
          {{ navPrevLabel }}
        </UiButton>
        <span class="marking-task-toolbar__progress">
          {{ batchProgress.current }} / {{ batchProgress.total }}
        </span>
        <UiButton
          size="sm"
          variant="outline"
          :disabled="!nextTaskId"
          @click="navigation.goToTask(nextTaskId)"
        >
          {{ navNextLabel }}
          <template #icon><RightOutlined /></template>
        </UiButton>
      </template>
      <UiButton variant="outline" size="sm" :loading="loading" @click="emit('refresh')">
        <template #icon><ReloadOutlined /></template>
        刷新
      </UiButton>
      <UiPopoverPanel
        v-if="recentList.length > 0"
        title="最近提交"
        :trigger="['click']"
        placement="bottomRight"
        :max-width="360"
        compact
      >
        <UiButton variant="outline" size="sm"> 最近提交 </UiButton>
        <template #content>
          <ul class="marking-task-toolbar__recent-list">
            <li
              v-for="entry in recentList"
              :key="entry.taskId"
              class="marking-task-toolbar__recent-item"
            >
              <div class="marking-task-toolbar__recent-meta">
                <span>第 {{ entry.batchIndex ?? '-' }}/{{ entry.batchTotal ?? '-' }} 份</span>
                <span>{{ entry.score }} 分</span>
              </div>
              <UiButton
                size="sm"
                variant="outline"
                :disabled="canWithdrawEntry(entry) !== true"
                @click="emit('withdraw-entry', entry)"
              >
                撤销
              </UiButton>
            </li>
          </ul>
        </template>
      </UiPopoverPanel>
    </div>
  </div>
</template>

<script lang="ts" setup>
// MVR-951：函数式 can*(...) 写入口仅认 === true
// MVR-946：模板 canManage* 显隐/禁用仅认 === true
import type { AnonymityModeCode } from '@/apis/mark/anonymity-mode'
import type {
  AllocationUnitCode,
  AnonymousRevealResponse,
  MarkingTaskResponse,
} from '@/apis/mark/marking-organization'
import {
  MarkingTaskStatusCode,
} from '@/apis/mark/marking-organization'
import { dualMarkRoleLabel } from '@/apis/mark/dual-mark-role'
import { GradeStatusCode } from '@/types/enums/grade-status-enum'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { MarkingRecentSubmitEntry } from '@/composables/useMarkingRecentSubmit'
import type { useMarkingTaskNavigation } from '@/composables/useMarkingTaskNavigation'
import InfoCircleOutlined from '@ant-design/icons-vue/InfoCircleOutlined'
import LeftOutlined from '@ant-design/icons-vue/LeftOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import RightOutlined from '@ant-design/icons-vue/RightOutlined'
import UnlockOutlined from '@ant-design/icons-vue/UnlockOutlined'
import { computed } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiPopoverPanel from '@/components/ui-guide/ui/UiPopoverPanel.vue'
import UiTooltip from '@/components/ui-guide/ui/UiTooltip.vue'

defineOptions({ name: 'MarkingTaskToolbar' })

const props = withDefaults(
  defineProps<{
  task: MarkingTaskResponse | null
  loading: boolean
  isReadOnly: boolean
  canManageOwnerIdentityReveal?: boolean // MVR-940: optional BE 能力位写路径仅认 === true
  revealedIdentity: AnonymousRevealResponse | null
  navigation: ReturnType<typeof useMarkingTaskNavigation>
  taskStatusTone: (status: MarkingTaskStatusCode) => BadgeTone
  taskStatusLabel: (status: MarkingTaskStatusCode) => string
  allocationUnitLabel: (unit: AllocationUnitCode) => string
  anonymityModeLabel: (mode: AnonymityModeCode) => string
  recentList: MarkingRecentSubmitEntry[]
  canWithdrawEntry: (entry: MarkingRecentSubmitEntry) => boolean
  /** 批次 prev/next 由页面 #footer 承载时设为 true */
  hideBatchNav?: boolean
}>(),
  {
  canManageOwnerIdentityReveal: false,
  },
)

const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'reveal'): void
  (e: 'withdraw-entry', entry: MarkingRecentSubmitEntry): void
}>()
const batchProgress = computed(() => props.navigation.batchProgress.value)
const prevTaskId = computed(() => props.navigation.prevTaskId.value)
const nextTaskId = computed(() => props.navigation.nextNavTaskId.value || props.navigation.nextTaskId.value)
const navPrevLabel = computed(() => props.navigation.navPrevLabel.value)
const navNextLabel = computed(() => props.navigation.navNextLabel.value)
</script>

<style lang="scss" scoped>
.marking-task-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-bg-container);

  &__main,
  &__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  &__progress {
    font-size: var(--dp-font-size-sm);
    font-weight: 500;
    color: var(--dp-text-secondary);
    padding: 0 4px;
    white-space: nowrap;
  }

  &__summary-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0;
  }

  &__summary-item {
    display: grid;
    grid-template-columns: 72px 1fr;
    gap: 8px;
    align-items: start;
    margin: 0;

    dt {
      margin: 0;
      font-size: var(--dp-font-size-xs);
      line-height: 1.5;
      color: var(--dp-text-muted);
    }

    dd {
      margin: 0;
      font-size: var(--dp-font-size-sm);
      line-height: 1.5;
      color: var(--dp-text-primary);
      word-break: break-word;
    }
  }

  &__recent-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__recent-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__recent-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-secondary);
  }
}
</style>
