<template>
  <UiDrawer
    :open="open"
    title="本题 AI 历次执行记录"
    width="720"
    placement="right"
    destroy-on-close
    @update:open="emit('update:open', $event)"
  >
    <UiSpin :spinning="loading === true" tip="加载 AI 历史...">
      <UiStateBlock
        v-if="loading !== true && loadFailed === true"
        state="error"
        size="sm"
        title="智能执行历史加载失败"
        description="当前审计记录不可用，已停止展示旧任务的执行历史。"
      />
      <UiEmpty
        v-else-if="loading !== true && executions.length === 0"
        size="sm"
        description="暂无 AI 执行记录"
      />
      <UiTimeline v-else>
        <UiTimelineItem
          v-for="(item, index) in executions"
          :key="`${item.traceId}-${index}`"
          :color="strictEnumTone(AI_EXECUTION_STATUS_TONE, item.status, '智能执行状态')"
        >
          <div
            :ref="(el) => registerItemRef(item.traceId, el)"
            class="marking-ai-assist-drawer__item"
            :class="{
              'marking-ai-assist-drawer__item--highlight':
                item.traceId && item.traceId === resolvedHighlightTraceId,
            }"
          >
            <div class="marking-ai-assist-drawer__head">
              <UiTag
                :tone="strictEnumTone(AI_ABILITY_TONE, item.abilityCode, '智能能力编码')"
                size="sm"
              >
                {{ strictEnumLabel(AiAbilityDescription, item.abilityCode, '智能能力编码') }}
              </UiTag>
              <UiTag
                :tone="strictEnumTone(AI_EXECUTION_STATUS_TONE, item.status, '智能执行状态')"
                size="sm"
              >
                {{ strictEnumLabel(AiExecutionStatusDescription, item.status, '智能执行状态') }}
              </UiTag>
              <span class="marking-ai-assist-drawer__time">{{
                formatDateTime(item.createTime)
              }}</span>
              <span v-if="item.latencyMs != null" class="marking-ai-assist-drawer__latency">
                耗时 {{ item.latencyMs }} ms
              </span>
            </div>
            <div v-if="item.traceId" class="marking-ai-assist-drawer__trace">
              处理追踪编号：{{ item.traceId }}
            </div>
            <div v-if="item.modelName" class="marking-ai-assist-drawer__model">
              模型：{{ item.modelName }}
              <span v-if="item.providerType">
                /
                {{ strictEnumLabel(AiProviderTypeDescription, item.providerType, 'AI 供应商类型') }}
              </span>
            </div>
            <div v-else class="marking-ai-assist-drawer__model">模型：未调用</div>
            <ExperienceAssistBadge
              clickable
              :applied="item.referenceExperienceAudit?.referenceExperienceApplied"
              :source-exam-name="item.referenceExperienceAudit?.referenceExperienceSourceExamName"
              :consistency-rate="item.referenceExperienceAudit?.referenceExperienceConsistencyRate"
              @open-ai-history="focusExecutionTrace(item.traceId)"
            />
            <p
              v-if="
                item.referenceExperienceAudit?.referenceExperienceApplied &&
                item.referenceExperienceAudit?.referenceExperienceMatchMode
              "
              class="marking-ai-assist-drawer__match-mode"
            >
              定标方式：{{
                strictEnumLabel(
                  MATCH_MODE_LABEL,
                  item.referenceExperienceAudit.referenceExperienceMatchMode,
                  '经验匹配方式',
                )
              }}
            </p>
            <div v-if="item.diagnostic" class="marking-ai-assist-drawer__diagnostic">
              <strong>处理说明：</strong>{{ diagnosticText(item.diagnostic) }}
            </div>
            <div v-if="item.responseSummary" class="marking-ai-assist-drawer__summary">
              <strong>响应摘要：</strong>{{ item.responseSummary }}
            </div>
          </div>
        </UiTimelineItem>
      </UiTimeline>
    </UiSpin>
  </UiDrawer>
</template>

<script lang="ts" setup>
import type { ComponentPublicInstance } from 'vue'
import { computed, nextTick, ref, watch } from 'vue'
import type { ExamQuestionAiExecutionItemResponse } from '@/apis/mark/exam-grade'
import {
  AI_ABILITY_TONE,
  AI_EXECUTION_STATUS_TONE,
  AiAbilityDescription,
  AiExecutionStatusDescription,
  AiProviderTypeDescription,
} from '@/apis/mark/exam-grade'
import type { GradingExperienceReferenceMatchModeCode } from '@/types/enums/grading-experience-reference-match-mode-enum'
import ExperienceAssistBadge from '@/components/mark/ExperienceAssistBadge.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiStateBlock from '@/components/ui-guide/ui/UiStateBlock.vue'
import UiTimeline from '@/components/ui-guide/ui/UiTimeline.vue'
import UiTimelineItem from '@/components/ui-guide/ui/UiTimelineItem.vue'
import { getUserErrorMessage } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'MarkingAiAssistDrawer' })

const props = withDefaults(
  defineProps<{
    open: boolean
    loading: boolean
    loadFailed?: boolean
    executions: ExamQuestionAiExecutionItemResponse[]
    highlightTraceId?: string | null
  }>(),
  {
    loadFailed: false,
  },
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const itemRefMap = new Map<string, HTMLElement>()
const focusedTraceId = ref<string | null>(null)

const resolvedHighlightTraceId = computed(() => props.highlightTraceId ?? focusedTraceId.value)

const MATCH_MODE_LABEL: Record<GradingExperienceReferenceMatchModeCode, string> = {
  EXPLICIT_BINDING: '题目显式绑定',
  SIMHASH_AUTO_MATCH: '相似题自动匹配',
}

function diagnosticText(diagnostic?: string): string {
  return getUserErrorMessage(
    { message: diagnostic },
    'AI 复评暂未生成可采纳评分，请按题目评分细则继续人工复核',
  )
}

function resolveItemElement(el: Element | ComponentPublicInstance | null): HTMLElement | null {
  if (!el) return null
  if (el instanceof HTMLElement) return el
  const root = (el as ComponentPublicInstance).$el
  return root instanceof HTMLElement ? root : null
}

function registerItemRef(
  traceId: string | undefined,
  el: Element | ComponentPublicInstance | null,
): void {
  if (!traceId) return
  const element = resolveItemElement(el)
  if (element) {
    itemRefMap.set(traceId, element)
    return
  }
  itemRefMap.delete(traceId)
}

function focusExecutionTrace(traceId?: string | null): void {
  if (!traceId) return
  focusedTraceId.value = traceId
  void nextTick(() => {
    itemRefMap.get(traceId)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
}

async function scrollToHighlightedTrace(): Promise<void> {
  if (props.open !== true || !resolvedHighlightTraceId.value || props.loading === true) return
  await nextTick()
  itemRefMap
    .get(resolvedHighlightTraceId.value)
    ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

watch(
  () => [props.open, props.loading, props.highlightTraceId, props.executions] as const,
  () => {
    if (props.highlightTraceId) {
      focusedTraceId.value = null
    }
    void scrollToHighlightedTrace()
  },
  { flush: 'post' },
)

watch(
  () => props.open,
  (open) => {
    if (!open) {
      focusedTraceId.value = null
    }
  },
)
</script>

<style lang="scss" scoped>
.marking-ai-assist-drawer {
  &__item {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component-tight);
    border-radius: var(--dp-radius-panel);
    transition: background-color var(--dp-duration-normal) var(--dp-ease-default);
  }

  &__item--highlight {
    background: color-mix(in srgb, var(--dp-purple-500) 10%, transparent);
    outline: 1px solid color-mix(in srgb, var(--dp-purple-500) 28%, transparent);
    padding: var(--dp-space-component-tight);
    margin: calc(-1 * var(--dp-space-component-tight));
  }

  &__head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--dp-space-component-tight);
  }

  &__time,
  &__latency,
  &__trace,
  &__model,
  &__match-mode {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
  }

  &__diagnostic,
  &__summary {
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
  }
}
</style>
