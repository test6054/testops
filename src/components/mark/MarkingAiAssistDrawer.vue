<template>
  <a-drawer
    :open="open"
    title="本题 AI 历次执行记录"
    width="720"
    placement="right"
    destroy-on-close
    @update:open="emit('update:open', $event)"
  >
    <a-spin :spinning="loading" tip="加载 AI 历史...">
      <UiEmpty v-if="!loading && executions.length === 0" description="暂无数据" />
      <a-timeline v-else>
        <a-timeline-item
          v-for="(item, index) in executions"
          :key="`${item.traceId}-${index}`"
          :color="timelineColor(item.status)"
        >
          <div class="marking-ai-assist-drawer__item">
            <div class="marking-ai-assist-drawer__head">
              <UiTag :tone="statusTone(item.status)" size="sm">
                {{ statusLabel(item.status) }}
              </UiTag>
              <UiTag :tone="abilityTone(item.abilityCode)" size="sm">
                {{ abilityLabel(item.abilityCode) }}
              </UiTag>
              <span class="marking-ai-assist-drawer__time">{{ item.createTime }}</span>
            </div>
            <div v-if="item.diagnostic" class="marking-ai-assist-drawer__diagnostic">
              {{ item.diagnostic }}
            </div>
          </div>
        </a-timeline-item>
      </a-timeline>
    </a-spin>
  </a-drawer>
</template>

<script lang="ts" setup>
import type {
  AiAbilityCode,
  AiExecutionStatusCode,
  ExamQuestionAiExecutionItemVO,
} from '@/apis/mark/exam-grade'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'

defineOptions({ name: 'MarkingAiAssistDrawer' })

defineProps<{
  open: boolean
  loading: boolean
  executions: ExamQuestionAiExecutionItemVO[]
  statusLabel: (status: AiExecutionStatusCode) => string
  statusTone: (status: AiExecutionStatusCode) => BadgeTone
  abilityLabel: (code: AiAbilityCode) => string
  abilityTone: (code: AiAbilityCode) => BadgeTone
  timelineColor: (status: AiExecutionStatusCode) => string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()
</script>

<style lang="scss" scoped>
.marking-ai-assist-drawer {
  &__item {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  &__time {
    font-size: 12px;
    color: var(--dp-text-muted, #64748b);
  }

  &__diagnostic {
    font-size: 13px;
    color: var(--dp-text-secondary, #475569);
  }
}
</style>
