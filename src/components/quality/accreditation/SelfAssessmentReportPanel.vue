<script setup lang="ts">
/**
 * 工程认证自评报告章节面板：CEEAA 八节左栏 + narrative/evidence 编辑。
 */
import type {
  AccreditationCockpitVO,
  AccreditationCycleVO,
  AccreditationEvidenceVO,
} from '@/apis/quality/accreditation'
import type {
  SelfAssessmentSectionEvidenceRefItem,
  SelfAssessmentSectionKey,
  SelfAssessmentSectionVO,
} from '@/apis/quality/self-assessment-section'
import { message } from 'ant-design-vue'
import { computed, reactive, ref, watch } from 'vue'
import { accreditationApi } from '@/apis/quality/accreditation'
import {
  SELF_ASSESSMENT_SECTION_CONTENT_STATUS_LABEL,
  SELF_ASSESSMENT_SECTION_CONTENT_STATUS_TONE,
  selfAssessmentSectionApi,
} from '@/apis/quality/self-assessment-section'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import {
  canEditSelfAssessmentSection,
  canSubmitSelfAssessment,
} from '@/composables/useAccreditationWorkbench'
import { showUserError } from '@/utils/error-handler'
import { readAllPages } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'SelfAssessmentReportPanel' })

const props = defineProps<{
  cockpit?: AccreditationCockpitVO
  activeCycle?: AccreditationCycleVO
  programId?: string
  trainingPlanId?: string
}>()

const emit = defineEmits<{
  (e: 'go-ai-report'): void
  (e: 'saved'): void
}>()

const SECTION_ORDER: SelfAssessmentSectionKey[] = [
  'STUDENT',
  'TRAINING_OBJECTIVE',
  'GRADUATION_REQUIREMENT',
  'CONTINUOUS_IMPROVEMENT',
  'CURRICULUM',
  'FACULTY',
  'SUPPORT',
  'ATTACHMENT',
]

const loading = ref(false)
const saving = ref(false)
const sections = ref<SelfAssessmentSectionVO[]>([])
const activeSectionKey = ref<SelfAssessmentSectionKey>('STUDENT')
const evidenceDrawerOpen = ref(false)
const evidenceLoading = ref(false)
const evidenceOptions = ref<AccreditationEvidenceVO[]>([])
const selectedEvidenceIds = ref<string[]>([])

const editor = reactive({
  narrativeContent: '',
  evidenceNarrative: '',
  evidenceRefs: [] as SelfAssessmentSectionEvidenceRefItem[],
})

const activeSection = computed(() =>
  sections.value.find((item) => item.sectionKey === activeSectionKey.value),
)

const readyCount = computed(() => sections.value.filter((item) => item.materialReady).length)

const canEdit = computed(() => canEditSelfAssessmentSection(props.activeCycle))

const canSubmit = computed(() => {
  if (!props.activeCycle) return false
  return canSubmitSelfAssessment(props.activeCycle) && readyCount.value >= 8
})

const submitHint = computed(() => {
  if (!props.activeCycle) return '请先创建并登记认证周期'
  if (readyCount.value < 8) {
    return `章节正文就绪 ${readyCount.value}/8，请补齐 narrative 或通过 AI 生成自评报告`
  }
  if (!canSubmitSelfAssessment(props.activeCycle)) {
    return '当前认证阶段不允许提交自评报告'
  }
  return '八节正文已就绪，可在「认证周期」Tab 提交自评报告'
})

function syncEditor(section?: SelfAssessmentSectionVO) {
  editor.narrativeContent = section?.narrativeContent || ''
  editor.evidenceNarrative = section?.evidenceNarrative || ''
  editor.evidenceRefs = (section?.evidenceRefs || []).map((item) => ({
    refType: item.refType,
    fieldPath: item.fieldPath,
    accreditationEvidenceId: item.accreditationEvidenceId,
  }))
}

async function loadSections() {
  const cycleId = props.activeCycle?.id
  if (!cycleId) {
    sections.value = []
    syncEditor(undefined)
    return
  }
  loading.value = true
  try {
    sections.value = await selfAssessmentSectionApi.listByCycle(cycleId)
    if (!sections.value.some((item) => item.sectionKey === activeSectionKey.value)) {
      activeSectionKey.value = SECTION_ORDER[0]
    }
    syncEditor(activeSection.value)
  } catch (error) {
    sections.value = []
    syncEditor(undefined)
    showUserError(error, '自评报告章节加载失败')
  } finally {
    loading.value = false
  }
}

function selectSection(key: SelfAssessmentSectionKey) {
  activeSectionKey.value = key
  syncEditor(activeSection.value)
}

async function saveSection() {
  const section = activeSection.value
  if (!section) return
  if (!canEdit.value) {
    message.error('当前认证阶段不允许编辑自评报告章节')
    return
  }
  saving.value = true
  try {
    await selfAssessmentSectionApi.save({
      id: section.id,
      narrativeContent: editor.narrativeContent,
      evidenceNarrative: editor.evidenceNarrative,
      evidenceRefs: editor.evidenceRefs,
    })
    message.success('章节已保存')
    await loadSections()
    emit('saved')
  } catch (error) {
    showUserError(error, '自评报告章节保存失败')
  } finally {
    saving.value = false
  }
}

function removeEvidenceRef(index: number) {
  editor.evidenceRefs.splice(index, 1)
}

async function openEvidenceDrawer() {
  if (!props.programId || !props.trainingPlanId) return
  evidenceDrawerOpen.value = true
  evidenceLoading.value = true
  selectedEvidenceIds.value = editor.evidenceRefs
    .filter((item) => item.refType === 'ACCREDITATION_EVIDENCE' && item.accreditationEvidenceId)
    .map((item) => item.accreditationEvidenceId!)
  try {
    evidenceOptions.value = await readAllPages(
      (pageNum: number) =>
        accreditationApi.evidencePage({
          pageNum,
          pageSize: 100,
          programId: props.programId,
          trainingPlanId: props.trainingPlanId,
        }),
      '认证证据加载失败',
    )
  } catch (error) {
    evidenceOptions.value = []
    showUserError(error, '认证证据加载失败')
  } finally {
    evidenceLoading.value = false
  }
}

function applySelectedEvidence() {
  const keptFieldRefs = editor.evidenceRefs.filter((item) => item.refType === 'FIELD_PATH')
  const evidenceRefs: SelfAssessmentSectionEvidenceRefItem[] = [...keptFieldRefs]
  for (const evidenceId of selectedEvidenceIds.value) {
    evidenceRefs.push({
      refType: 'ACCREDITATION_EVIDENCE',
      accreditationEvidenceId: evidenceId,
    })
  }
  editor.evidenceRefs = evidenceRefs
  evidenceDrawerOpen.value = false
}

function sectionStatusLabel(section: SelfAssessmentSectionVO): string {
  return strictEnumLabel(
    SELF_ASSESSMENT_SECTION_CONTENT_STATUS_LABEL,
    section.contentStatus,
    '自评章节状态',
  )
}

function sectionStatusTone(section: SelfAssessmentSectionVO) {
  return strictEnumTone(
    SELF_ASSESSMENT_SECTION_CONTENT_STATUS_TONE,
    section.contentStatus,
    '自评章节状态',
  )
}

watch(
  () => props.activeCycle?.id,
  () => {
    void loadSections()
  },
  { immediate: true },
)

watch(activeSectionKey, () => {
  syncEditor(activeSection.value)
})
</script>

<template>
  <UiCard title="自评报告章节（CEEAA 八节）">
    <template #extra>
      <UiButton variant="primary" size="sm" :disabled="!canEdit" @click="emit('go-ai-report')">
        AI 生成自评报告
      </UiButton>
    </template>

    <p class="self-assessment-panel__hint">{{ submitHint }}</p>

    <UiEmpty v-if="!activeCycle" description="请先创建认证周期" />

    <div v-else class="self-assessment-panel__layout">
      <nav class="self-assessment-panel__nav" aria-label="自评报告章节">
        <button
          v-for="section in sections"
          :key="section.sectionKey"
          type="button"
          class="self-assessment-panel__nav-item"
          :class="{ 'is-active': section.sectionKey === activeSectionKey }"
          @click="selectSection(section.sectionKey)"
        >
          <UiTag :tone="section.materialReady ? 'green' : 'orange'" size="sm">
            {{ section.materialReady ? '就绪' : '待写' }}
          </UiTag>
          <span class="self-assessment-panel__nav-title">{{ section.sectionTitle }}</span>
          <UiTag v-if="section.aiGenerated" tone="blue" size="sm">AI</UiTag>
        </button>
      </nav>

      <div v-if="activeSection" class="self-assessment-panel__editor">
        <div class="self-assessment-panel__editor-head">
          <h3 class="self-assessment-panel__editor-title">{{ activeSection.sectionTitle }}</h3>
          <UiTag :tone="sectionStatusTone(activeSection)" size="sm">
            {{ sectionStatusLabel(activeSection) }}
          </UiTag>
        </div>

        <label class="self-assessment-panel__field">
          <span>Narrative 正文</span>
          <a-textarea
            v-model:value="editor.narrativeContent"
            :disabled="!canEdit || loading"
            :rows="10"
            placeholder="填写本章节自评 narrative，或通过 AI 生成后在此修订"
          />
        </label>

        <label class="self-assessment-panel__field">
          <span>Evidence narrative</span>
          <a-textarea
            v-model:value="editor.evidenceNarrative"
            :disabled="!canEdit || loading"
            :rows="6"
            placeholder="说明本章节支撑证据及其认证含义"
          />
        </label>

        <div class="self-assessment-panel__evidence">
          <div class="self-assessment-panel__evidence-head">
            <span>证据引用</span>
            <UiButton variant="outline" size="sm" :disabled="!canEdit" @click="openEvidenceDrawer">
              关联认证证据
            </UiButton>
          </div>
          <ul v-if="editor.evidenceRefs.length" class="self-assessment-panel__evidence-list">
            <li
              v-for="(evidenceRef, index) in editor.evidenceRefs"
              :key="`${evidenceRef.refType}-${index}`"
            >
              <UiTag tone="gray" size="sm">
                {{ evidenceRef.refType === 'FIELD_PATH' ? '字段路径' : '认证证据' }}
              </UiTag>
              <span>
                {{
                  evidenceRef.refType === 'FIELD_PATH'
                    ? evidenceRef.fieldPath
                    : evidenceRef.accreditationEvidenceId
                }}
              </span>
              <UiButton v-if="canEdit" variant="ghost" size="sm" @click="removeEvidenceRef(index)">
                移除
              </UiButton>
            </li>
          </ul>
          <p v-else class="self-assessment-panel__evidence-empty">尚未绑定证据引用</p>
        </div>

        <div class="self-assessment-panel__actions">
          <UiButton
            variant="primary"
            size="sm"
            :disabled="!canEdit"
            :loading="saving"
            @click="saveSection"
          >
            保存章节
          </UiButton>
        </div>
      </div>
    </div>

    <p v-if="canSubmit" class="self-assessment-panel__ready">
      八节正文检查通过，请切换到「认证周期」提交自评报告。
    </p>

    <UiDrawer v-model:open="evidenceDrawerOpen" title="关联认证证据" width="480">
      <a-spin :spinning="evidenceLoading">
        <a-checkbox-group
          v-model:value="selectedEvidenceIds"
          class="self-assessment-panel__evidence-picker"
        >
          <label
            v-for="item in evidenceOptions"
            :key="item.id"
            class="self-assessment-panel__evidence-option"
          >
            <a-checkbox :value="item.id" />
            <span>{{ item.evidenceTitle }}</span>
          </label>
        </a-checkbox-group>
      </a-spin>
      <template #footer>
        <UiButton variant="primary" size="sm" @click="applySelectedEvidence">确定</UiButton>
      </template>
    </UiDrawer>
  </UiCard>
</template>

<style scoped lang="scss">
.self-assessment-panel__hint {
  margin: 0 0 12px;
  color: var(--dp-text-secondary);
  font-size: 13px;
}

.self-assessment-panel__layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 16px;
  min-height: 420px;
}

.self-assessment-panel__nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-right: 1px solid var(--ant-color-border-secondary);
  padding-right: 12px;
}

.self-assessment-panel__nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.self-assessment-panel__nav-item.is-active {
  background: var(--ant-color-fill-tertiary);
}

.self-assessment-panel__nav-title {
  flex: 1;
  font-size: 13px;
  color: var(--dp-text-primary);
}

.self-assessment-panel__editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.self-assessment-panel__editor-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.self-assessment-panel__editor-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.self-assessment-panel__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--dp-text-secondary);
}

.self-assessment-panel__evidence-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--dp-text-secondary);
}

.self-assessment-panel__evidence-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.self-assessment-panel__evidence-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.self-assessment-panel__evidence-empty {
  margin: 0;
  font-size: 13px;
  color: var(--dp-text-secondary);
}

.self-assessment-panel__actions {
  display: flex;
  justify-content: flex-end;
}

.self-assessment-panel__ready {
  margin: 12px 0 0;
  color: var(--ant-color-success);
  font-size: 13px;
}

.self-assessment-panel__evidence-picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.self-assessment-panel__evidence-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
</style>
