<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioIndustryEducationProjectVO,
  PortfolioVirtualTeachingRoomActivityVO,
} from '@/apis/portfolio/policy-ledger'
import message from 'ant-design-vue/es/message'
import { onMounted, reactive, ref } from 'vue'
import {
  portfolioIndustryEducationProjectApi,
  portfolioVirtualTeachingRoomActivityApi,
} from '@/apis/portfolio/policy-ledger'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { showUserError } from '@/utils/error-handler'

const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()
const {
  archiveWriteForbidden,
  archiveWriteBlockMessage,
  assertArchiveWritable,
} = usePortfolioArchiveWriteGuard()
const tab = ref<'virtual' | 'industry'>('virtual')
const loading = ref(false)
const virtualRows = ref<PortfolioVirtualTeachingRoomActivityVO[]>([])
const industryRows = ref<PortfolioIndustryEducationProjectVO[]>([])
const virtualTotal = ref(0)
const industryTotal = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)

const reviewStatusOptions = [
  { label: '全部状态', value: '' },
  { label: '草稿', value: 'DRAFT' },
  { label: '待审核', value: 'PENDING_REVIEW' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已退回', value: 'REJECTED' },
]
const reviewFilter = ref('')

const virtualForm = reactive({
  roomName: '',
  activityTitle: '',
  activityType: 'JOINT_PREP',
  roleCode: 'MEMBER',
  reviewStatus: 'APPROVED',
  partnerEnterprise: '',
  leadUnit: '',
})
const industryForm = reactive({
  projectName: '',
  projectType: 'INDUSTRY_COLLEGE',
  stageCode: 'ACCEPT',
  roleCode: 'LEADER',
  reviewStatus: 'APPROVED',
  enterpriseName: '',
})
const saving = ref(false)

const virtualColumns: ColumnsType = [
  { title: '教研室', dataIndex: 'roomName', key: 'roomName' },
  { title: '活动', dataIndex: 'activityTitle', key: 'activityTitle' },
  { title: '类型', dataIndex: 'activityTypeLabel', key: 'activityTypeLabel', width: 160 },
  { title: '角色', dataIndex: 'roleLabel', key: 'roleLabel', width: 100 },
  { title: '生命周期', key: 'lifecycleStatus', width: 160 },
  { title: '状态', key: 'reviewStatus', width: 100 },
]
const industryColumns: ColumnsType = [
  { title: '项目', dataIndex: 'projectName', key: 'projectName' },
  { title: '类型', dataIndex: 'projectTypeLabel', key: 'projectTypeLabel', width: 120 },
  { title: '阶段', dataIndex: 'stageCode', key: 'stageCode', width: 100 },
  { title: '角色', dataIndex: 'roleCode', key: 'roleCode', width: 100 },
  { title: '多身份', key: 'ownerIdentityLayers', width: 220 },
  { title: '生命周期', key: 'lifecycleStatus', width: 160 },
  { title: '状态', key: 'reviewStatus', width: 100 },
]

function statusTone(status?: string): 'blue' | 'orange' | 'green' | 'gray' | 'red' {
  if (status === 'APPROVED') return 'green'
  if (status === 'PENDING_REVIEW') return 'orange'
  if (status === 'REJECTED') return 'red'
  return 'gray'
}

function lifecycleTagTone(record: { lifecycleStatus?: string }): 'green' | 'orange' | 'gray' | 'red' {
  if (record.lifecycleStatus === 'ACTIVE') return 'green'
  if (record.lifecycleStatus === 'TEMP_HOLD') return 'orange'
  if (record.lifecycleStatus === 'SEALED' || record.lifecycleStatus === 'TRANSFERRED') return 'red'
  return 'gray'
}

async function loadPage() {
  if (canPickTeachers.value && !targetTeacherId.value) {
    virtualRows.value = []
    industryRows.value = []
    return
  }
  loading.value = true
  try {
    if (tab.value === 'virtual') {
      const page = await portfolioVirtualTeachingRoomActivityApi.page({
        pageNum: pageNum.value,
        pageSize: pageSize.value,
        teacherUserId: targetTeacherId.value || undefined,
        reviewStatus: reviewFilter.value || undefined,
      })
      virtualRows.value = page.list ?? []
      virtualTotal.value = page.total ?? 0
    } else {
      const page = await portfolioIndustryEducationProjectApi.page({
        pageNum: pageNum.value,
        pageSize: pageSize.value,
        teacherUserId: targetTeacherId.value || undefined,
        reviewStatus: reviewFilter.value || undefined,
      })
      industryRows.value = page.list ?? []
      industryTotal.value = page.total ?? 0
    }
  } catch (error) {
    showUserError(error, '加载政策专项台账失败')
  } finally {
    loading.value = false
  }
}

async function saveVirtual() {
  if (!targetTeacherId.value) {
    message.warning('请先选择教师')
    return
  }
  if (!assertArchiveWritable('登记虚拟教研室活动')) {
    return
  }
  if (!virtualForm.roomName.trim() || !virtualForm.activityTitle.trim()) {
    message.warning('请填写教研室名称与活动标题')
    return
  }
  saving.value = true
  try {
    await portfolioVirtualTeachingRoomActivityApi.save({
      teacherUserId: targetTeacherId.value,
      roomName: virtualForm.roomName.trim(),
      activityTitle: virtualForm.activityTitle.trim(),
      activityType: virtualForm.activityType,
      roleCode: virtualForm.roleCode,
      reviewStatus: virtualForm.reviewStatus,
      partnerEnterprise: virtualForm.partnerEnterprise || undefined,
      leadUnit: virtualForm.leadUnit || undefined,
    })
    message.success('虚拟教研室活动已保存')
    virtualForm.roomName = ''
    virtualForm.activityTitle = ''
    await loadPage()
  } catch (error) {
    showUserError(error, '保存虚拟教研室活动失败')
  } finally {
    saving.value = false
  }
}

async function saveIndustry() {
  if (!targetTeacherId.value) {
    message.warning('请先选择教师')
    return
  }
  if (!assertArchiveWritable('登记产教项目')) {
    return
  }
  if (!industryForm.projectName.trim()) {
    message.warning('请填写项目名称')
    return
  }
  saving.value = true
  try {
    await portfolioIndustryEducationProjectApi.save({
      teacherUserId: targetTeacherId.value,
      projectName: industryForm.projectName.trim(),
      projectType: industryForm.projectType,
      stageCode: industryForm.stageCode,
      roleCode: industryForm.roleCode,
      reviewStatus: industryForm.reviewStatus,
      enterpriseName: industryForm.enterpriseName || undefined,
    })
    message.success('产教项目已保存')
    industryForm.projectName = ''
    await loadPage()
  } catch (error) {
    showUserError(error, '保存产教项目失败')
  } finally {
    saving.value = false
  }
}

usePortfolioScopedLoader(
  () => {
    pageNum.value = 1
    void loadPage()
  },
  () => targetTeacherId.value,
)

onMounted(() => {
  void loadPage()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="政策专项台账">
        <template #actions>
          <UiButton size="sm" variant="outline" :loading="loading" @click="loadPage">刷新</UiButton>
        </template>
      </ContextBar>
    </template>

    <PortfolioTeacherPickGate />

    <UiCard
      v-if="archiveWriteForbidden"
      class="policy-ledger__block"
      title="档案写禁"
    >
      <p class="policy-ledger__hint">{{ archiveWriteBlockMessage }}</p>
    </UiCard>

    <UiCard class="policy-ledger__block">
      <div class="policy-ledger__toolbar">
        <UiButton
          size="sm"
          :variant="tab === 'virtual' ? 'primary' : 'outline'"
          @click="tab = 'virtual'; pageNum = 1; loadPage()"
        >
          §8.41 虚拟教研室
        </UiButton>
        <UiButton
          size="sm"
          :variant="tab === 'industry' ? 'primary' : 'outline'"
          @click="tab = 'industry'; pageNum = 1; loadPage()"
        >
          §8.46 产教项目
        </UiButton>
        <UiSelect
          size="sm"
          v-model="reviewFilter"
          style="width: 140px"
          :options="reviewStatusOptions"
          @update:model-value="() => { pageNum = 1; loadPage() }"
        />
      </div>
      <p class="policy-ledger__hint">
        贡献度仅统计「已通过」台账；未审核不得进入画像贡献与双高材料。
      </p>
    </UiCard>

    <UiCard v-if="tab === 'virtual'" title="登记虚拟教研室活动" class="policy-ledger__block">
      <div class="policy-ledger__form">
        <input v-model="virtualForm.roomName" class="input" placeholder="教研室名称" />
        <input v-model="virtualForm.activityTitle" class="input" placeholder="活动标题" />
        <input v-model="virtualForm.leadUnit" class="input" placeholder="牵头单位" />
        <input v-model="virtualForm.partnerEnterprise" class="input" placeholder="合作企业" />
        <UiSelect
          size="sm"
          v-model="virtualForm.activityType"
          style="width: 200px"
          :options="[
            { label: '国/省级建设任务', value: 'NATIONAL_PROVINCIAL_TASK' },
            { label: '联合课程开发', value: 'JOINT_COURSE' },
            { label: '联合备课教研', value: 'JOINT_PREP' },
            { label: '资源库共建', value: 'RESOURCE_POOL' },
            { label: '教材/实训开发', value: 'TEXTBOOK_OR_TRAINING' },
            { label: '成果推广', value: 'PROMOTION' },
          ]"
        />
        <UiSelect
          size="sm"
          v-model="virtualForm.roleCode"
          style="width: 140px"
          :options="[
            { label: '负责人', value: 'LEADER' },
            { label: '核心成员', value: 'CORE' },
            { label: '参与成员', value: 'MEMBER' },
            { label: '外部导师', value: 'EXTERNAL_MENTOR' },
          ]"
        />
        <UiSelect
          size="sm"
          v-model="virtualForm.reviewStatus"
          style="width: 120px"
          :options="reviewStatusOptions.filter((o) => o.value)"
        />
        <UiButton size="sm" variant="primary" :loading="saving" :disabled="archiveWriteForbidden" @click="saveVirtual">保存</UiButton>
      </div>
      <UiDataTable
        :loading="loading"
        :columns="virtualColumns"
        :data-source="virtualRows"
        :pagination="{ current: pageNum, pageSize, total: virtualTotal, onChange: (p: number) => { pageNum = p; loadPage() } }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'lifecycleStatus'">
            <UiTag v-if="record.lifecycleStatus" :tone="lifecycleTagTone(record)">
              {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
            </UiTag>
            <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
            <UiTag v-if="record.archiveWriteForbidden" tone="red" class="ml-1">档案写禁</UiTag>
            <span v-if="!record.lifecycleStatus && !record.evaluationHeld && !record.archiveWriteForbidden">—</span>
          </template>
          <template v-else-if="column.key === 'reviewStatus'">
            <UiTag :tone="statusTone(record.reviewStatus)">{{ record.reviewStatusLabel || record.reviewStatus }}</UiTag>
          </template>
        </template>
        <template #emptyText>
          <UiEmpty size="sm" description="暂无虚拟教研室活动" />
        </template>
      </UiDataTable>
    </UiCard>

    <UiCard v-else title="登记产教项目" class="policy-ledger__block">
      <div class="policy-ledger__form">
        <input v-model="industryForm.projectName" class="input" placeholder="项目名称" />
        <input v-model="industryForm.enterpriseName" class="input" placeholder="合作企业" />
        <UiSelect
          size="sm"
          v-model="industryForm.projectType"
          style="width: 160px"
          :options="[
            { label: '产业学院', value: 'INDUSTRY_COLLEGE' },
            { label: '订单班', value: 'ORDER_CLASS' },
            { label: '现代学徒制', value: 'MODERN_APPRENTICE' },
            { label: '现场工程师', value: 'FIELD_ENGINEER' },
            { label: '实训基地', value: 'TRAINING_BASE' },
          ]"
        />
        <UiSelect
          size="sm"
          v-model="industryForm.stageCode"
          style="width: 120px"
          :options="[
            { label: '验收', value: 'ACCEPT' },
            { label: '建设中', value: 'RUNNING' },
            { label: '启动', value: 'START' },
            { label: '规划', value: 'PLAN' },
          ]"
        />
        <UiSelect
          size="sm"
          v-model="industryForm.roleCode"
          style="width: 120px"
          :options="[
            { label: '负责人', value: 'LEADER' },
            { label: '核心', value: 'CORE' },
            { label: '参与', value: 'MEMBER' },
          ]"
        />
        <UiSelect
          size="sm"
          v-model="industryForm.reviewStatus"
          style="width: 120px"
          :options="reviewStatusOptions.filter((o) => o.value)"
        />
        <UiButton size="sm" variant="primary" :loading="saving" :disabled="archiveWriteForbidden" @click="saveIndustry">保存</UiButton>
      </div>
      <UiDataTable
        :loading="loading"
        :columns="industryColumns"
        :data-source="industryRows"
        :pagination="{ current: pageNum, pageSize, total: industryTotal, onChange: (p: number) => { pageNum = p; loadPage() } }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'ownerIdentityLayers'">
            <div v-if="record.ownerIdentityLayers?.length" class="policy-ledger__identities">
              <UiTag
                v-for="(layer, idx) in record.ownerIdentityLayers"
                :key="layer.identityId || `${layer.identityType}-${idx}`"
                tone="blue"
                class="policy-ledger__identity-tag"
              >
                {{ layer.identityTypeLabel || layer.displayName || layer.identityType }}
              </UiTag>
              <p v-if="record.ownerMultiIdentityNote" class="policy-ledger__identity-note">
                {{ record.ownerMultiIdentityNote }}
              </p>
            </div>
            <span v-else class="policy-ledger__muted">—</span>
          </template>
          <template v-else-if="column.key === 'lifecycleStatus'">
            <UiTag v-if="record.lifecycleStatus" :tone="lifecycleTagTone(record)">
              {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
            </UiTag>
            <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
            <UiTag v-if="record.archiveWriteForbidden" tone="red" class="ml-1">档案写禁</UiTag>
            <span v-if="!record.lifecycleStatus && !record.evaluationHeld && !record.archiveWriteForbidden">—</span>
          </template>
          <template v-else-if="column.key === 'reviewStatus'">
            <UiTag :tone="statusTone(record.reviewStatus)">{{ record.reviewStatusLabel || record.reviewStatus }}</UiTag>
          </template>
        </template>
        <template #emptyText>
          <UiEmpty size="sm" description="暂无产教项目" />
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.policy-ledger__block {
  margin-top: var(--dp-space-4);
}
.policy-ledger__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.policy-ledger__hint {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--dp-text-secondary);
}
.policy-ledger__form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}
.input {
  padding: 6px 8px;
  border: 1px solid var(--dp-border);
  border-radius: 4px;
  min-width: 140px;
}
</style>
