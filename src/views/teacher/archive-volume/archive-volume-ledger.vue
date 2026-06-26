<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <UiTag tone="blue" size="sm">查阅台账</UiTag>
        </template>
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="goList">返回列表</UiButton>
        </template>
      </ContextBar>
    </template>

    <UiFilterBar
      v-model="filterModel"
      :fields="filterFields"
      search-text="定位归档卷"
      @search="locateVolume"
      @reset="handleReset"
    />

    <UiEmpty
      v-if="!selectedVolumeId"
      description="输入档案号或关键词定位归档卷，再查看查阅台账"
    />

    <template v-else>
      <div class="archive-volume-ledger__head">
        <span class="archive-volume-ledger__title">{{ selectedArchiveNo }}</span>
        <UiButton variant="outline" size="sm" @click="goDetail">打开卷详情</UiButton>
      </div>

      <UiDataTable
        pagination-mode="none"
        :columns="accessColumns"
        :data-source="accessRecords"
        :loading="loading"
        :show-pagination="false"
        flat
        row-key="accessRecordId"
        size="middle"
        empty-description="该卷暂无查阅记录"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'accessStatus'">
            <UiTag :tone="accessStatusTone(record.accessStatus)" size="sm">
              {{ accessStatusLabel(record.accessStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'approvedTime'">
            {{ formatDateTime(record.approvedTime) }}
          </template>
          <template v-else-if="column.key === 'expireTime'">
            {{ formatDateTime(record.expireTime) }}
          </template>
        </template>
      </UiDataTable>
    </template>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveAccessStatusCode,
  ArchiveVolumeAccessRecordVO,
  ArchiveVolumeVO,
} from '@/apis/mark/archive-volume'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ARCHIVE_ACCESS_STATUS_LABEL,
  ARCHIVE_ACCESS_STATUS_TONE,
  listArchiveVolumeAccessRecords,
  pageArchiveVolumes,
} from '@/apis/mark/archive-volume'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { formatDateTime } from '@/utils/format'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherArchiveVolumeLedger' })

const router = useRouter()
const loading = ref(false)
const selectedVolumeId = ref('')
const selectedArchiveNo = ref('')
const accessRecords = ref<ArchiveVolumeAccessRecordVO[]>([])
const filterModel = reactive({ keyword: '' })

const filterFields: FilterField[] = [
  { key: 'keyword', label: '档案号 / 标题', type: 'input', placeholder: '关键词' },
]

const accessColumns: ColumnsType<ArchiveVolumeAccessRecordVO> = [
  { title: '状态', key: 'accessStatus', width: 100 },
  { title: '查阅原因', dataIndex: 'accessReason' },
  { title: '批准时间', key: 'approvedTime', width: 160 },
  { title: '过期时间', key: 'expireTime', width: 160 },
]

function accessStatusLabel(code: ArchiveAccessStatusCode) {
  return strictEnumLabel(ARCHIVE_ACCESS_STATUS_LABEL, code, 'accessStatus')
}

function accessStatusTone(code: ArchiveAccessStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_ACCESS_STATUS_TONE, code, 'accessStatus')
}

async function locateVolume() {
  const keyword = filterModel.keyword.trim()
  if (!keyword) {
    message.warning('请输入关键词')
    return
  }
  loading.value = true
  try {
    const page = await pageArchiveVolumes({ keyword, pageNum: 1, pageSize: 1 })
    const list = readPageList(page, '归档卷查询异常')
    const volume: ArchiveVolumeVO | undefined = list[0]
    if (!volume) {
      message.warning('未找到匹配的归档卷')
      selectedVolumeId.value = ''
      selectedArchiveNo.value = ''
      accessRecords.value = []
      return
    }
    selectedVolumeId.value = volume.volumeId
    selectedArchiveNo.value = volume.archiveNo
    accessRecords.value = await listArchiveVolumeAccessRecords(volume.volumeId)
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

function handleReset() {
  filterModel.keyword = ''
  selectedVolumeId.value = ''
  selectedArchiveNo.value = ''
  accessRecords.value = []
}

function goList() {
  void router.push({ name: 'TeacherArchiveVolumeList' })
}

function goDetail() {
  if (!selectedVolumeId.value) return
  void router.push({ name: 'TeacherArchiveVolumeDetail', params: { volumeId: selectedVolumeId.value } })
}
</script>

<style scoped>
.archive-volume-ledger__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: var(--dp-space-4, 16px) 0;
}

.archive-volume-ledger__title {
  font-weight: 600;
  font-size: 16px;
}
</style>
