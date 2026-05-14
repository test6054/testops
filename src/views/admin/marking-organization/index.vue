<template>
  <GiPageLayout>
    <div class="organization-index-page">
      <PageHeader title="阅卷组织管理">
        <template #tags>
          <UiTag v-if="organization?.organizationStatus" :tone="STATUS_TONE[organization.organizationStatus]" size="md">
            {{ STATUS_LABEL[organization.organizationStatus] }}
          </UiTag>
          <UiTag v-if="organization" tone="blue" size="md">题组 {{ organization.groups?.length ?? 0 }}</UiTag>
        </template>
        <template #actions>
          <a-select
            :value="selectedExamId"
            style="width: 280px"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="onExamChange"
          />
          <UiButton
            variant="outline"
            size="sm"
            :disabled="!selectedExamId"
            :loading="loading"
            @click="loadOrganization"
          >
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
          <UiButton
            v-if="selectedExamId && !organization && !loading"
            size="sm"
            @click="openCreateModal"
          >
            <template #icon><PlusOutlined /></template>
            新建组织
          </UiButton>
          <UiButton
            v-if="organization"
            size="sm"
            @click="goDetail"
          >
            <template #icon><RightOutlined /></template>
            进入详情
          </UiButton>
        </template>
      </PageHeader>

      <UiEmpty
        v-if="!selectedExamId"
        description="请先选择考试以查看 / 创建阅卷组织"
        class="empty-block"
      />

      <a-spin v-else :spinning="loading" tip="加载组织中...">
        <UiCard v-if="organization" class="org-summary-card">
          <template #title>
            <ProfileOutlined />
            <span>组织全貌</span>
            <UiBadge tone="blue">EXAM #{{ organization.examId }}</UiBadge>
          </template>

          <a-descriptions
            :column="{ xs: 1, sm: 2, lg: 3 }"
            size="middle"
            bordered
            class="org-descriptions"
          >
            <a-descriptions-item label="组长用户ID">
              <a-typography-text copyable>{{ organization.leaderUserId || '-' }}</a-typography-text>
            </a-descriptions-item>
            <a-descriptions-item label="组织状态">
              <UiTag v-if="organization.organizationStatus" :tone="STATUS_TONE[organization.organizationStatus]" size="sm">
                {{ STATUS_LABEL[organization.organizationStatus] }}
              </UiTag>
            </a-descriptions-item>
            <a-descriptions-item label="匿名阅卷">
              <UiTag :tone="organization.anonymousMode ? 'green' : 'gray'" size="sm">
                {{ organization.anonymousMode ? '启用' : '关闭' }}
              </UiTag>
            </a-descriptions-item>
            <a-descriptions-item label="题组数量">
              {{ organization.groups?.length ?? 0 }} 组
            </a-descriptions-item>
            <a-descriptions-item label="创建时间">
              {{ formatTime(organization.createTime) }}
            </a-descriptions-item>
            <a-descriptions-item label="更新时间">
              {{ formatTime(organization.updateTime) }}
            </a-descriptions-item>
            <a-descriptions-item label="备注" :span="3">
              <span v-if="organization.remark">{{ organization.remark }}</span>
              <span v-else class="muted">-</span>
            </a-descriptions-item>
          </a-descriptions>

          <a-divider class="section-divider" />

          <div class="actions-row">
            <UiButton size="sm" @click="goDetail">
              <template #icon><SettingOutlined /></template>
              管理题组与策略
            </UiButton>
            <UiButton size="sm" variant="outline" @click="goSessions">
              <template #icon><PlayCircleOutlined /></template>
              试评 / 正评会话
            </UiButton>
          </div>
        </UiCard>

        <UiCard v-else-if="!loading" class="empty-org-card">
          <template #title>
            <InfoCircleOutlined />
            <span>本考试尚未创建阅卷组织</span>
          </template>
          <p class="empty-org-desc">
            阅卷组织是组织教师批改试卷的核心实体；创建后可继续编排题组、配置分配策略并启动试评 / 正评。
          </p>
          <UiButton size="md" @click="openCreateModal">
            <template #icon><PlusOutlined /></template>
            立即创建阅卷组织
          </UiButton>
        </UiCard>
      </a-spin>
    </div>

    <a-modal
      v-model:open="createModalOpen"
      title="新建阅卷组织"
      :confirm-loading="creating"
      ok-text="提交创建"
      cancel-text="取消"
      :width="560"
      @ok="submitCreate"
    >
      <a-form ref="createFormRef" :model="createForm" :rules="createRules" layout="vertical">
        <a-form-item label="关联考试">
          <a-input :value="selectedExamLabel" disabled />
        </a-form-item>
        <a-form-item label="阅卷组长" name="leaderUserId" required>
          <a-select
            v-model:value="createForm.leaderUserId"
            placeholder="选择组长（仅教师）"
            show-search
            option-filter-prop="label"
            :options="teacherOptions"
            :loading="teacherLoading"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="是否启用匿名阅卷" name="anonymousMode">
          <a-switch v-model:checked="createForm.anonymousMode" />
          <span class="hint">启用后阅卷教师不可见考生身份</span>
        </a-form-item>
        <a-form-item label="备注" name="remark">
          <a-textarea
            v-model:value="createForm.remark"
            :rows="3"
            :maxlength="200"
            placeholder="可选，记录组织目的 / 范围"
            show-count
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { UserListItemDto } from '@/apis/edu/admin-user'
import type {
  MarkingOrganizationVO,
  OrganizationCreatePayload,
} from '@/apis/mark/marking-organization'
import InfoCircleOutlined from '@ant-design/icons-vue/InfoCircleOutlined'
import PlayCircleOutlined from '@ant-design/icons-vue/PlayCircleOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import RightOutlined from '@ant-design/icons-vue/RightOutlined'
import SettingOutlined from '@ant-design/icons-vue/SettingOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { adminGetUserPage } from '@/apis/edu/admin-user'
import {
  createOrganization,
  getOrganization,
  MARKING_ORGANIZATION_STATUS_LABEL as STATUS_LABEL,
  MARKING_ORGANIZATION_STATUS_TONE as STATUS_TONE,
} from '@/apis/mark/marking-organization'
import PageHeader from '@/components/common/PageHeader.vue'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiBadge, UiButton, UiCard, UiEmpty, UiTag } from '@/components/ui-guide/ui'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'

defineOptions({ name: 'AdminMarkingOrganizationIndex' })

const router = useRouter()

const {
  exams,
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

const selectedExamLabel = computed(() => {
  const exam = exams.value.find(item => item.examId === selectedExamId.value)
  if (!exam) return ''
  return exam.examNo ? `${exam.examName} (${exam.examNo})` : exam.examName
})

const organization = ref<MarkingOrganizationVO | null>(null)
const loading = ref(false)

async function loadOrganization(): Promise<void> {
  if (!selectedExamId.value) {
    organization.value = null
    return
  }
  loading.value = true
  try {
    organization.value = await getOrganization({ examId: selectedExamId.value })
  } catch {
    organization.value = null
  } finally {
    loading.value = false
  }
}

const teacherList = ref<UserListItemDto[]>([])
const teacherLoading = ref(false)

const teacherOptions = computed(() =>
  teacherList.value.map(item => ({
    value: item.id,
    label: item.identifierNumber
      ? `${item.nickName || item.userName} (${item.identifierNumber})`
      : item.nickName || item.userName,
  })),
)

async function loadTeachers(): Promise<void> {
  teacherLoading.value = true
  try {
    const result = await adminGetUserPage({
      pageNum: 1,
      pageSize: 200,
      roleKey: 'SCH_TECH',
    })
    teacherList.value = result.list ?? []
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '教师列表加载失败'
    message.error(errMsg)
  } finally {
    teacherLoading.value = false
  }
}

const createModalOpen = ref(false)
const creating = ref(false)
const createFormRef = ref<FormInstance>()

interface CreateForm {
  leaderUserId?: string
  anonymousMode: boolean
  remark?: string
}

const createForm = reactive<CreateForm>({
  leaderUserId: undefined,
  anonymousMode: true,
  remark: '',
})

const createRules: Record<string, Rule[]> = {
  leaderUserId: [{ required: true, message: '请选择阅卷组长', trigger: 'change' }],
  remark: [{ max: 200, message: '备注最多 200 字', trigger: 'blur' }],
}

function openCreateModal(): void {
  if (!selectedExamId.value) {
    message.warning('请先选择考试')
    return
  }
  createForm.leaderUserId = undefined
  createForm.anonymousMode = true
  createForm.remark = ''
  createModalOpen.value = true
  if (teacherList.value.length === 0) {
    void loadTeachers()
  }
}

async function submitCreate(): Promise<void> {
  if (!selectedExamId.value || !createFormRef.value) return
  try {
    await createFormRef.value.validate()
  } catch {
    return
  }
  creating.value = true
  try {
    const payload: OrganizationCreatePayload = {
      examId: selectedExamId.value,
      leaderUserId: createForm.leaderUserId!,
      anonymousMode: createForm.anonymousMode,
      remark: createForm.remark?.trim() || undefined,
    }
    organization.value = await createOrganization(payload)
    message.success('阅卷组织已创建')
    createModalOpen.value = false
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '创建阅卷组织失败'
    message.error(errMsg)
  } finally {
    creating.value = false
  }
}

function goDetail(): void {
  if (!organization.value) return
  void router.push({
    name: 'AdminMarkingOrganizationDetail',
    params: { organizationId: organization.value.id },
  })
}

function goSessions(): void {
  if (!organization.value) return
  void router.push({
    name: 'AdminMarkingOrganizationSessions',
    params: { organizationId: organization.value.id },
  })
}

function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

watch(selectedExamId, () => {
  void loadOrganization()
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) {
    await loadOrganization()
  }
})
</script>

<style lang="scss" scoped>
.organization-index-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-block {
  margin-top: 48px;
}

.org-summary-card {
  :deep(.descriptions-row) {
    background-color: #fafafa;
  }
}

.org-descriptions {
  :deep(.ant-descriptions-item-label) {
    width: 140px;
    color: #595959;
  }
}

.section-divider {
  margin: 16px 0 12px;
}

.actions-row {
  display: flex;
  gap: 8px;
}

.empty-org-card {
  text-align: center;
}

.empty-org-desc {
  margin: 8px 0 16px;
  font-size: 14px;
  line-height: 1.5;
  color: #595959;
}

.muted {
  color: #bfbfbf;
}

.hint {
  margin-left: 8px;
  font-size: 12px;
  color: #8c8c8c;
}
</style>
