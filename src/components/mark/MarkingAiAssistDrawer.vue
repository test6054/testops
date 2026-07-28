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
      <UiEmpty size="sm" v-if="loading !== true && executions.length === 0" description="暂无 AI 执行记录" />
      <UiTimeline v-else>
        <UiTimelineItem
          v-for="(item, index) in executions"
          :key="`${item.traceId}-${index}`"
          :color="timelineColor(item.status)"
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
              <UiTag :tone="abilityTone(item.abilityCode)" size="sm">
                {{ abilityLabel(item.abilityCode) }}
              </UiTag>
              <UiTag :tone="statusTone(item.status)" size="sm">
                {{ statusLabel(item.status) }}
              </UiTag>
              <span class="marking-ai-assist-drawer__time">{{ formatTime(item.createTime) }}</span>
              <span v-if="item.latencyMs != null" class="marking-ai-assist-drawer__latency">
                耗时 {{ item.latencyMs }} ms
              </span>
            </div>
            <div v-if="item.traceId" class="marking-ai-assist-drawer__trace">
              处理追踪编号：{{ item.traceId }}
            </div>
            <div v-if="item.modelName" class="marking-ai-assist-drawer__model">
              模型：{{ item.modelName }}
              <span v-if="item.providerType"> / {{ providerLabel(item.providerType) }}</span>
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
                item.referenceExperienceAudit?.referenceExperienceApplied
                  && item.referenceExperienceAudit?.referenceExperienceMatchMode
              "
              class="marking-ai-assist-drawer__match-mode"
            >
              定标方式：{{
                matchModeLabel(item.referenceExperienceAudit.referenceExperienceMatchMode)
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
import type {
  AiAbilityCode,
  AiExecutionStatusCode,
  AiProviderTypeCode,
  ExamQuestionAiExecutionItemResponse,
} from '@/apis/mark/exam-grade'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { GradingExperienceReferenceMatchModeCode } from '@/types/enums/grading-experience-reference-match-mode-enum'
import { computed, nextTick, ref, watch } from 'vue'
import { AiProviderTypeDescription } from '@/apis/mark/exam-grade'
import ExperienceAssistBadge from '@/components/mark/ExperienceAssistBadge.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTimeline from '@/components/ui-guide/ui/UiTimeline.vue'
import UiTimelineItem from '@/components/ui-guide/ui/UiTimelineItem.vue'
import { getUserErrorMessage } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'MarkingAiAssistDrawer' })

const props = defineProps<{
  open: boolean
  loading: boolean
  executions: ExamQuestionAiExecutionItemResponse[]
  highlightTraceId?: string | null
  statusLabel: (status: AiExecutionStatusCode) => string
  statusTone: (status: AiExecutionStatusCode) => BadgeTone
  abilityLabel: (code: AiAbilityCode) => string
  abilityTone: (code: AiAbilityCode) => BadgeTone
  timelineColor: (status: AiExecutionStatusCode) => string
}>()

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

function formatTime(value?: string): string {
  if (!value) return '—'
  return formatDateTime(value)
}

function providerLabel(providerType: AiProviderTypeCode): string {
  return strictEnumLabel(AiProviderTypeDescription, providerType, 'AI 供应商类型')
}

function matchModeLabel(mode: GradingExperienceReferenceMatchModeCode): string {
  return MATCH_MODE_LABEL[mode]
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
    border-radius: 6px;
    transition: background-color var(--dp-duration-normal) var(--dp-ease-default);
  }

  &__item--highlight {
    background: color-mix(in srgb, var(--dp-purple-500) 10%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dp-purple-500) 28%, transparent);
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
