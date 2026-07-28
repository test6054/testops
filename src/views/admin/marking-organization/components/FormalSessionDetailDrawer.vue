<template>
  <UiDrawer
    :open="open"
    title="正评会话详情"
    :width="600"
    hide-footer
    @update:open="emit('update:open', $event)"
  >
    <template v-if="session">
      <UiInfoGrid :columns="2">
        <UiInfoGridItem label="题组">{{ session.groupName }}</UiInfoGridItem>
        <UiInfoGridItem label="状态">
          <UiTag
            :tone="
              strictEnumTone(FORMAL_SESSION_STATUS_TONE, session.sessionStatus, '正评会话状态')
            "
            size="sm"
          >
            {{
              strictEnumLabel(FormalSessionStatusDescription, session.sessionStatus, '正评会话状态')
            }}
          </UiTag>
        </UiInfoGridItem>
        <UiInfoGridItem label="批阅单元">
          {{ strictEnumLabel(AllocationUnitDescription, session.allocationUnit, '批阅任务单元') }}
        </UiInfoGridItem>
        <UiInfoGridItem label="创建时间">
          {{ formatDateTime(session.createTime) || '—' }}
        </UiInfoGridItem>
        <UiInfoGridItem label="开始时间">
          {{ formatDateTime(session.startTime) || '—' }}
        </UiInfoGridItem>
        <UiInfoGridItem label="结束时间">
          {{ formatDateTime(session.endTime) || '—' }}
        </UiInfoGridItem>
      </UiInfoGrid>

      <section class="formal-detail-drawer__section">
        <h4 class="formal-detail-drawer__title">题目范围</h4>
        <p class="formal-detail-drawer__text">{{ formatFormalSessionQuestionScope(session) }}</p>
        <p
          v-if="
            session.allocationUnit === AllocationUnitCode.RANDOM_QUESTIONS
              && session.questionScopes.length > 0
          "
          class="formal-detail-drawer__warn"
        >
          随机抽题结果已在启动时固化；完成正评仅表示本场抽中题目的阅卷任务已交卷，不代表整卷批阅完成。
        </p>
      </section>

      <section class="formal-detail-drawer__section">
        <h4 class="formal-detail-drawer__title">任务进度</h4>
        <p class="formal-detail-drawer__text">{{ formatFormalSessionTaskProgress(session) }}</p>
        <p class="formal-detail-drawer__text">
          {{ formatFormalSessionGradeClosureProgress(session) }}
        </p>
        <p v-if="session.sessionCompletionBlockedReason" class="formal-detail-drawer__error">
          {{ session.sessionCompletionBlockedReason }}
        </p>
        <p v-else-if="session.sessionGradeClosureBlockedReason" class="formal-detail-drawer__error">
          {{ session.sessionGradeClosureBlockedReason }}
        </p>
      </section>

      <section class="formal-detail-drawer__section">
        <h4 class="formal-detail-drawer__title">试评-正评一致性</h4>
        <p class="formal-detail-drawer__text">
          可比
          {{ session.trialFormalMatchedSampleCount == null ? '—' : session.trialFormalMatchedSampleCount }}
          · 漂移
          {{ session.trialFormalDriftedSampleCount == null ? '—' : session.trialFormalDriftedSampleCount }}
          · 一致性
          {{
            session.trialFormalConsistencyRate == null
              ? '—'
              : `${session.trialFormalConsistencyRate}%`
          }}
        </p>
        <p v-if="session.trialFormalConsistencyCheckedTime" class="formal-detail-drawer__text">
          最近刷新 {{ formatDateTime(session.trialFormalConsistencyCheckedTime) }}
        </p>
        <UiButton
          variant="outline"
          size="sm"
          :disabled="session.sessionStatus === FormalSessionStatusCode.SESSION_CREATED"
          @click="consistencyOpen = true"
        >
          查看定标对照
        </UiButton>
      </section>

      <section
        v-if="session.pauseReason || session.closeReason"
        class="formal-detail-drawer__section"
      >
        <h4 class="formal-detail-drawer__title">运维记录</h4>
        <p v-if="session.pauseReason" class="formal-detail-drawer__text">
          暂停原因：{{ session.pauseReason }}
        </p>
        <p v-if="session.closeReason" class="formal-detail-drawer__text">
          关闭原因：{{ session.closeReason }}
        </p>
      </section>
    </template>
  </UiDrawer>

  <TrialFormalConsistencyDrawer v-model:open="consistencyOpen" :session="session" />
</template>

<script lang="ts" setup>
import type { FormalSessionResponse } from '@/apis/mark/marking-organization'
import { ref } from 'vue'
import {
  AllocationUnitDescription,
  FORMAL_SESSION_STATUS_TONE,
  FormalSessionStatusDescription,
} from '@/apis/mark/marking-organization'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiInfoGrid from '@/components/ui-guide/ui/InfoGrid.vue'
import UiInfoGridItem from '@/components/ui-guide/ui/InfoGridItem.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import { AllocationUnitCode } from '@/types/enums/allocation-unit-enum'
import { FormalSessionStatusCode } from '@/types/enums/formal-session-status-enum'
import {
  formatFormalSessionGradeClosureProgress,
  formatFormalSessionQuestionScope,
  formatFormalSessionTaskProgress,
} from '@/utils/formal-session-display'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import TrialFormalConsistencyDrawer from './TrialFormalConsistencyDrawer.vue'

defineOptions({ name: 'FormalSessionDetailDrawer' })

defineProps<{
  open: boolean
  session: FormalSessionResponse | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const consistencyOpen = ref(false)
</script>

<style lang="scss" scoped>
.formal-detail-drawer {
  &__section {
    margin-top: var(--dp-space-block);
  }

  &__title {
    margin: 0 0 var(--dp-space-component-tight);
    font-size: var(--dp-font-size-md);
    font-weight: 600;
  }

  &__text {
    margin: 0 0 var(--dp-space-component-tight);
    font-size: var(--dp-font-size-sm);
    line-height: 1.6;
    color: var(--dp-text-secondary);
  }

  &__warn {
    margin: var(--dp-space-component-tight) 0 0;
    font-size: var(--dp-font-size-xs);
    color: var(--dp-warning);
  }

  &__error {
    margin: var(--dp-space-component-tight) 0 0;
    font-size: var(--dp-font-size-xs);
    color: var(--dp-error);
  }
}
</style>
