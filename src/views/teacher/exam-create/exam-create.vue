<template>
  <CreateFormPageShell
    title="新建考试"
    subtitle="考务信息 → 阅卷队伍 → 考生范围 → 确认创建"
    :nav-items="ec.navItems.value"
    :active-key="ec.activeSection.value"
    @back="ec.handleGoBack"
    @nav-select="(key) => void scrollToSection(key)"
  >
    <template #actions>
      <UiButton
        variant="primary"
        :loading="ec.submitting.value"
        :disabled="ec.submitting.value === true || ec.rosterPreviewSyncing.value === true"
        @click="handleSubmit"
      >
        <template v-if="!ec.submitting.value" #icon><SaveOutlined /></template>
        {{ ec.submitting.value ? '创建中…' : '创建' }}
      </UiButton>
    </template>

    <UiSpin :spinning="ec.submitting.value" tip="正在创建…">
      <BasicSettingsStep
        :basic-rules="ec.basicRules"
        @course-change="ec.setCourseSelection"
        @update:basic-form-ref="ec.basicFormRef.value = $event"
      />
      <MarkingTeamStep
        :marking-team-rules="ec.markingTeamRules"
        @chief-change="ec.setChiefExaminer"
        @reviewers-change="ec.setReviewerNickNames"
        @update:marking-team-form-ref="ec.markingTeamFormRef.value = $event"
      />
      <CandidateScopeStep
        :roster-rules="ec.rosterRules"
        @change-scope-mode="ec.changeScopeMode"
        @sync-class-scope="ec.syncClassScopeCandidates"
        @roster-preview-syncing="ec.setRosterPreviewSyncing"
        @add-candidates="ec.addCandidates"
        @remove-candidate="ec.removeCandidate"
        @update:roster-form-ref="ec.rosterFormRef.value = $event"
      />
      <ConfirmStep />
    </UiSpin>

    <template #footer>
      <UiButton size="sm" variant="ghost" @click="ec.handleGoBack">取消</UiButton>
      <UiButton
        variant="primary"
        :loading="ec.submitting.value"
        :disabled="ec.submitting.value === true || ec.rosterPreviewSyncing.value === true"
        @click="handleSubmit"
      >
        <template v-if="!ec.submitting.value" #icon><SaveOutlined /></template>
        {{ ec.submitting.value ? '创建中…' : '创建考试' }}
      </UiButton>
    </template>
  </CreateFormPageShell>

  <UiConfirmModal
    v-model:open="ec.showSuccessModal.value"
    type="success"
    title="创建成功"
    content="考试、阅卷队伍与考生范围已创建，可进入工作台继续准备。"
    ok-text="进入工作台"
    cancel-text="返回列表"
    :closable="false"
    :mask-closable="false"
    @ok="ec.handleViewWorkspace"
    @cancel="ec.handleBackToList"
  />
</template>

<script setup lang="ts">
import SaveOutlined from '@ant-design/icons-vue/SaveOutlined'
import { nextTick, provide } from 'vue'
import CreateFormPageShell from '@/components/create-form/CreateFormPageShell.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiConfirmModal from '@/components/ui-guide/ui/ConfirmModal.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import { useCreateFormScrollSpy } from '@/composables/useCreateFormScrollSpy'
import BasicSettingsStep from './BasicSettingsStep.vue'
import CandidateScopeStep from './CandidateScopeStep.vue'
import ConfirmStep from './ConfirmStep.vue'
import {
  examCreateBasicFormKey,
  examCreateMarkingTeamFormKey,
  examCreateRosterFormKey,
  isExamCreateSectionKey,
} from './exam-create-context'
import MarkingTeamStep from './MarkingTeamStep.vue'
import { useExamCreate } from './useExamCreate'

defineOptions({ name: 'TeacherCreateExam' })

const ec = useExamCreate()
provide(examCreateBasicFormKey, ec.examForm)
provide(examCreateMarkingTeamFormKey, ec.markingTeamForm)
provide(examCreateRosterFormKey, ec.rosterForm)

const { scrollToSection: scrollToSectionAnchor } = useCreateFormScrollSpy(
  ec.navItems,
  ec.activeSection,
)

async function scrollToSection(sectionId: string): Promise<void> {
  if (!isExamCreateSectionKey(sectionId)) return
  if (!(await ec.validateStepsBeforeSection(sectionId))) {
    if (isExamCreateSectionKey(ec.activeSection.value)) {
      scrollToSectionAnchor(ec.activeSection.value)
      await nextTick()
      ec.scrollToFirstInvalidField()
    }
    return
  }
  scrollToSectionAnchor(sectionId)
}

async function handleSubmit(): Promise<void> {
  const failedSection = await ec.handleCreateExam()
  if (!failedSection) return
  scrollToSectionAnchor(failedSection)
  await nextTick()
  ec.scrollToFirstInvalidField()
}
</script>
