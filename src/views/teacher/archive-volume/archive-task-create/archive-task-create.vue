<template>
  <CreateFormPageShell
    :title="pageTitle"
    :subtitle="pageSubtitle"
    :nav-items="ac.navItems.value"
    :active-key="ac.activeSection.value"
    @back="ac.handleGoBack"
    @nav-select="scrollToSection"
  >
    <template #actions>
      <UiButton
        variant="primary"
        :loading="ac.submitting.value"
        :disabled="ac.submitting.value || ac.templateLoading.value || ac.templateLoadFailed.value"
        @click="handleSubmit"
      >
        <template v-if="!ac.submitting.value" #icon><SaveOutlined /></template>
        {{ ac.submitting.value ? '创建中…' : '创建' }}
      </UiButton>
    </template>

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
      description="无法确认当前租户可用的目录模板，课程考核袋暂不可创建。"
      dense
      class="create-layout__submit-error"
    />
    <UiSpin :spinning="ac.submitting.value" tip="正在创建…">
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
        variant="primary"
        :loading="ac.submitting.value"
        :disabled="ac.submitting.value || ac.templateLoading.value || ac.templateLoadFailed.value"
        @click="handleSubmit"
      >
        <template v-if="!ac.submitting.value" #icon><SaveOutlined /></template>
        {{ ac.submitting.value ? '创建中…' : '创建课程考核袋' }}
      </UiButton>
    </template>
  </CreateFormPageShell>
</template>

<script setup lang="ts">
import SaveOutlined from '@ant-design/icons-vue/SaveOutlined'
import { computed, provide } from 'vue'
import CreateFormPageShell from '@/components/create-form/CreateFormPageShell.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import { useCreateFormScrollSpy } from '@/composables/useCreateFormScrollSpy'
import { ArchiveTaskProvenanceCode } from '@/types/enums/archive-task-provenance-enum'
import {
  archiveTaskCreateBasicFormKey,
  archiveTaskCreatePlanFormKey,
  archiveTaskCreateWizardStateKey,
} from './archive-task-create-context'
import TaskArchivePlanStep from './TaskArchivePlanStep.vue'
import TaskBasicInfoStep from './TaskBasicInfoStep.vue'
import TaskConfirmStep from './TaskConfirmStep.vue'
import { useArchiveTaskCreate } from './useArchiveTaskCreate'

defineOptions({ name: 'TeacherCreateArchiveTask' })

const ac = useArchiveTaskCreate()
const { scrollToSection } = useCreateFormScrollSpy(ac.navItems, ac.activeSection)

const pageTitle = computed(() => {
  if (ac.wizardState.provenance === ArchiveTaskProvenanceCode.HISTORICAL_DIGITIZE) return '历史考核袋补录'
  return '新建课程考核袋'
})
const pageSubtitle = computed(() => {
  if (ac.wizardState.provenance === ArchiveTaskProvenanceCode.HISTORICAL_DIGITIZE) {
    return '历史学期手工立袋 → 创建后到详情上传与整理材料（禁止 Excel 建袋）'
  }
  return '本学期手工立袋 → 创建后到详情上传与整理材料（线上阅卷请走归档复盘）'
})

provide(archiveTaskCreateBasicFormKey, ac.basicForm)
provide(archiveTaskCreatePlanFormKey, ac.planForm)
provide(archiveTaskCreateWizardStateKey, ac.wizardState)

async function handleSubmit(): Promise<void> {
  const failedSection = await ac.handleCreateTask()
  if (failedSection) {
    scrollToSection(failedSection)
  }
}
</script>
