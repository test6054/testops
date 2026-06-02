<script setup lang="ts">
import type { ProgramSupportProfileSaveRequest, ProgramSupportProfileVO } from '@/apis/quality'
import { accreditationApi } from '@/apis/quality'
import { message } from 'ant-design-vue'
import { reactive, ref, watch } from 'vue'
import { UiButton, UiEmpty } from '@/components/ui-guide/ui'
import { showUserError } from '@/utils/error-handler'

const props = defineProps<{
  programId: string
  trainingPlanId: string
}>()

const emit = defineEmits<{ refresh: [] }>()

const loading = ref(false)
const saving = ref(false)
const profile = ref<ProgramSupportProfileVO | null>(null)

const form = reactive<ProgramSupportProfileSaveRequest>({
  programId: '',
  trainingPlanId: '',
  facultySummary: '',
  facultyStructureRemark: '',
  supportFacilitySummary: '',
  supportLibraryRemark: '',
  supportItRemark: '',
  industryCoopRemark: '',
  studentDevelopmentRemark: '',
  qualityAssuranceRemark: '',
})

function syncFormFromProfile(p: ProgramSupportProfileVO | null) {
  form.programId = props.programId
  form.trainingPlanId = props.trainingPlanId
  form.id = p?.id
  form.facultySummary = p?.facultySummary || ''
  form.facultyStructureRemark = p?.facultyStructureRemark || ''
  form.supportFacilitySummary = p?.supportFacilitySummary || ''
  form.supportLibraryRemark = p?.supportLibraryRemark || ''
  form.supportItRemark = p?.supportItRemark || ''
  form.industryCoopRemark = p?.industryCoopRemark || ''
  form.studentDevelopmentRemark = p?.studentDevelopmentRemark || ''
  form.qualityAssuranceRemark = p?.qualityAssuranceRemark || ''
}

async function loadProfile() {
  if (!props.trainingPlanId) return
  loading.value = true
  try {
    profile.value = await accreditationApi.currentSupportProfile(props.trainingPlanId)
    syncFormFromProfile(profile.value)
  } catch (e) {
    showUserError(e)
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  saving.value = true
  try {
    const id = await accreditationApi.saveSupportProfile(form)
    form.id = id
    message.success('师资与支持条件档案已保存')
    await loadProfile()
    emit('refresh')
  } catch (e) {
    showUserError(e)
  } finally {
    saving.value = false
  }
}

async function confirmProfile() {
  if (!form.id) {
    message.error('请先保存档案')
    return
  }
  try {
    await accreditationApi.confirmSupportProfile(form.id)
    message.success('档案已确认，可供自评报告与专家包引用')
    await loadProfile()
    emit('refresh')
  } catch (e) {
    showUserError(e)
  }
}

watch(() => props.trainingPlanId, loadProfile, { immediate: true })

defineExpose({ loadProfile })
</script>

<template>
  <div v-if="loading" class="loading">加载中…</div>
  <div v-else class="support-panel">
    <div class="status-bar">
      <span v-if="profile?.profileStatus === 'CONFIRMED'" class="confirmed">已确认</span>
      <span v-else-if="profile">草稿</span>
      <span v-else>尚未建档</span>
      <div class="actions">
        <UiButton variant="outline" :loading="saving" @click="saveProfile">保存</UiButton>
        <UiButton
          variant="primary"
          :disabled="!form.id || profile?.profileStatus === 'CONFIRMED'"
          @click="confirmProfile"
        >
          确认档案
        </UiButton>
      </div>
    </div>
    <a-form layout="vertical" class="form-grid">
      <a-form-item label="师资队伍概况（标准 6）">
        <a-textarea v-model:value="form.facultySummary" :rows="4" />
      </a-form-item>
      <a-form-item label="师资结构说明">
        <a-textarea v-model:value="form.facultyStructureRemark" :rows="3" />
      </a-form-item>
      <a-form-item label="实验与工程训练设施（标准 7）">
        <a-textarea v-model:value="form.supportFacilitySummary" :rows="4" />
      </a-form-item>
      <a-form-item label="图书与文献资源">
        <a-textarea v-model:value="form.supportLibraryRemark" :rows="3" />
      </a-form-item>
      <a-form-item label="信息化与计算资源">
        <a-textarea v-model:value="form.supportItRemark" :rows="3" />
      </a-form-item>
      <a-form-item label="产学合作与实习基地">
        <a-textarea v-model:value="form.industryCoopRemark" :rows="3" />
      </a-form-item>
      <a-form-item label="学生发展与支持">
        <a-textarea v-model:value="form.studentDevelopmentRemark" :rows="3" />
      </a-form-item>
      <a-form-item label="质量保障体系">
        <a-textarea v-model:value="form.qualityAssuranceRemark" :rows="3" />
      </a-form-item>
    </a-form>
    <UiEmpty v-if="!trainingPlanId" description="请选择培养方案" />
  </div>
</template>

<style scoped>
.support-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.confirmed {
  color: #389e0d;
  font-weight: 500;
}
.actions {
  display: flex;
  gap: 8px;
}
.form-grid {
  max-width: 720px;
}
.loading {
  padding: 24px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
