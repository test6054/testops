<template>
  <CreateFormPageShell
    title="新建归档任务"
    subtitle="任务来源 → 任务信息 → 归档方案 → 确认创建"
    :nav-items="ac.navItems.value"
    :active-key="ac.activeSection.value"
    @back="ac.handleGoBack"
    @nav-select="scrollToSection"
  >
    <UiAlertStrip
      v-if="ac.submitErrorMessage.value"
      tone="error"
      title="创建失败"
      :description="ac.submitErrorMessage.value"
      dense
      class="create-layout__submit-error"
    />
    <UiAlertStrip
      v-if="ac.templateLoadFailed.value"
      tone="error"
      title="目录模板加载失败"
      description="无法确认当前租户可用的目录模板，归档任务暂不可创建。"
      dense
      class="create-layout__submit-error"
    >
      <template #actions>
        <UiButton
          size="sm"
          variant="outline"
          :loading="ac.templateLoading.value"
          @click="ac.loadTemplateSets"
        >
          重新加载
        </UiButton>
      </template>
    </UiAlertStrip>
    <UiSpin :spinning="ac.submitting.value" tip="正在创建…">
      <TaskProvenanceStep @select="handleProvenanceSelect" @batch-excel="ac.goBatchExcelImport" />
      <TaskBasicInfoStep
        :basic-rules="ac.basicRules"
        @course-change="ac.setCourseSelection"
        @department-change="ac.setDepartmentSelection"
        @teaching-class-change="ac.setTeachingClassSelection"
        @update:basic-form-ref="ac.basicFormRef.value = $event"
      />
      <TaskArchivePlanStep
        :plan-rules="ac.planRules"
        :template-set-options="ac.templateSetOptions.value"
        :template-loading="ac.templateLoading.value"
        @template-change="ac.setTemplateSet"
        @responsible-change="ac.setResponsibleUser"
        @update:plan-form-ref="ac.planFormRef.value = $event"
      />
      <TaskConfirmStep :provenance-label="ac.provenanceLabel.value" />
    </UiSpin>

    <template #footer>
      <UiButton size="sm" variant="ghost" @click="ac.handleGoBack">取消</UiButton>
      <UiButton
        size="sm"
        variant="primary"
        :loading="ac.submitting.value"
        :disabled="ac.submitting.value || ac.templateLoading.value || ac.templateLoadFailed.value"
        @click="handleSubmit"
      >
        <template v-if="!ac.submitting.value" #icon><SaveOutlined /></template>
        {{ ac.submitting.value ? '创建中…' : '创建归档任务' }}
      </UiButton>
    </template>
  </CreateFormPageShell>
</template>

<script setup lang="ts">
import type { ArchiveTaskProvenanceCode } from '@/types/enums/archive-task-provenance-enum'
import SaveOutlined from '@ant-design/icons-vue/SaveOutlined'
import { provide } from 'vue'
import CreateFormPageShell from '@/components/create-form/CreateFormPageShell.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import { useCreateFormScrollSpy } from '@/composables/useCreateFormScrollSpy'
import {
  archiveTaskCreateBasicFormKey,
  archiveTaskCreatePlanFormKey,
  archiveTaskCreateWizardStateKey,
} from './archive-task-create-context'
import TaskArchivePlanStep from './TaskArchivePlanStep.vue'
import TaskBasicInfoStep from './TaskBasicInfoStep.vue'
import TaskConfirmStep from './TaskConfirmStep.vue'
import TaskProvenanceStep from './TaskProvenanceStep.vue'
import { useArchiveTaskCreate } from './useArchiveTaskCreate'

defineOptions({ name: 'TeacherCreateArchiveTask' })

const ac = useArchiveTaskCreate()
const { scrollToSection } = useCreateFormScrollSpy(ac.navItems, ac.activeSection)

provide(archiveTaskCreateBasicFormKey, ac.basicForm)
provide(archiveTaskCreatePlanFormKey, ac.planForm)
provide(archiveTaskCreateWizardStateKey, ac.wizardState)

async function handleProvenanceSelect(provenance: ArchiveTaskProvenanceCode): Promise<void> {
  await ac.selectProvenanceAndContinue(provenance)
  if (ac.wizardState.provenance !== provenance) return
  scrollToSection('archive-task-basic')
}

async function handleSubmit(): Promise<void> {
  const failedSection = await ac.handleCreateTask()
  if (failedSection) {
    scrollToSection(failedSection)
  }
}
</script>
