<script setup lang="ts">
import type { ScannerKioskArchiveVolumeItemVO } from '@/apis/mark/scanner-kiosk'
import { createAdhocDispatchTicket, pageKioskArchiveVolumes } from '@/apis/mark/scanner-kiosk'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ARCHIVE_VOLUME_STATUS_LABEL, ARCHIVE_VOLUME_STATUS_TONE } from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import { getUserErrorMessage } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const props = defineProps<{
  open: boolean
  scannerDeviceId: string
  scannerStationId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const router = useRouter()
const loading = ref(false)
const pickingVolumeId = ref('')
const errorMessage = ref('')
const keyword = ref('')
const pageNum = ref(1)
const pageSize = ref(20)
const total = ref(0)
const volumes = ref<ScannerKioskArchiveVolumeItemVO[]>([])

const canPick = computed(() => Boolean(props.scannerDeviceId && props.scannerStationId))

const columns = [
  {
    title: '柜位',
    key: 'physicalStorageLocation',
    dataIndex: 'physicalStorageLocation',
    width: 140,
  },
  { title: '归档编号', key: 'archiveNo', dataIndex: 'archiveNo', width: 120 },
  { title: '卷名', key: 'archiveTitle', dataIndex: 'archiveTitle', ellipsis: true },
  { title: '教学班', key: 'teachingClassName', dataIndex: 'teachingClassName', width: 120 },
  { title: '状态', key: 'volumeStatus', dataIndex: 'volumeStatus', width: 96 },
  { title: '操作', key: 'actions', width: 88 },
]

watch(
  () => props.open,
  (open) => {
    if (open) {
      pageNum.value = 1
      keyword.value = ''
      void loadVolumes()
    }
  },
)

async function loadVolumes() {
  loading.value = true
  errorMessage.value = ''
  try {
    const page = await pageKioskArchiveVolumes({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      keyword: keyword.value.trim() || undefined,
    })
    volumes.value = readPageList(page, '归档卷列表加载失败，请稍后重试')
    total.value = readPageTotal(page, '归档卷总数加载失败，请稍后重试')
  } catch (error) {
    errorMessage.value = getUserErrorMessage(error)
    volumes.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handlePageChange(pageEvent: { current: number; pageSize: number }) {
  pageNum.value = pageEvent.current
  pageSize.value = pageEvent.pageSize
  void loadVolumes()
}

async function pickVolume(row: ScannerKioskArchiveVolumeItemVO) {
  if (!canPick.value) {
    message.error('工位未激活，无法创建临时派单')
    return
  }
  if (row.volumeStatus !== 'COLLECTING') {
    message.error('仅收集中归档卷可临时开单')
    return
  }
  if (!row.physicalStorageLocation?.trim()) {
    message.error('该卷尚未登记档案柜位，请先在 PC 端补录柜位后再临时开单')
    return
  }
  pickingVolumeId.value = row.volumeId
  try {
    const response = await createAdhocDispatchTicket({
      taskKind: 'EXAM_ARCHIVE',
      volumeId: row.volumeId,
      scannerDeviceId: props.scannerDeviceId,
      scannerStationId: props.scannerStationId,
      physicalStorageLocation: row.physicalStorageLocation,
      physicalLocationNote: row.physicalLocationNote,
    })
    const ticketId = response.ticket?.ticketId
    if (!ticketId) {
      message.error('临时派单创建失败')
      return
    }
    emit('update:open', false)
    void router.push(`/scanner-kiosk/dispatch/${ticketId}`)
  } catch (error) {
    message.error(getUserErrorMessage(error))
  } finally {
    pickingVolumeId.value = ''
  }
}

function volumeStatusLabel(status: ScannerKioskArchiveVolumeItemVO['volumeStatus']) {
  return strictEnumLabel(ARCHIVE_VOLUME_STATUS_LABEL, status, 'volumeStatus')
}

function volumeStatusTone(status: ScannerKioskArchiveVolumeItemVO['volumeStatus']) {
  return strictEnumTone(ARCHIVE_VOLUME_STATUS_TONE, status, 'volumeStatus')
}
</script>

<template>
  <a-drawer
    :open="open"
    title="临时扫描 · 选择归档卷"
    width="880"
    destroy-on-close
    @update:open="emit('update:open', $event)"
  >
    <p class="kiosk-archive-pick__hint">
      仅展示当前权限范围内、状态为收集中且按柜位排序的归档卷。选定后将创建临时派单并进入认知确认。
    </p>
    <div class="kiosk-archive-pick__toolbar">
      <a-input-search
        v-model:value="keyword"
        placeholder="搜索卷名 / 编号 / 柜位"
        allow-clear
        @search="
          () => {
            pageNum = 1
            loadVolumes()
          }
        "
      />
      <UiButton size="sm" variant="outline" :disabled="loading" @click="loadVolumes">
        刷新
      </UiButton>
    </div>
    <p v-if="errorMessage" class="kiosk-archive-pick__error">{{ errorMessage }}</p>
    <UiDataTable
      pagination-mode="server"
      :columns="columns"
      :data-source="volumes"
      :loading="loading"
      :total="total"
      :current="pageNum"
      :page-size="pageSize"
      row-key="volumeId"
      size="middle"
      flat
      @page-change="handlePageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'physicalStorageLocation'">
          {{ record.physicalStorageLocation || '—' }}
        </template>
        <template v-else-if="column.key === 'volumeStatus'">
          <UiTag :tone="volumeStatusTone(record.volumeStatus)" size="sm">
            {{ volumeStatusLabel(record.volumeStatus) }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiButton
            size="sm"
            variant="primary"
            :loading="pickingVolumeId === record.volumeId"
            :disabled="!canPick || record.volumeStatus !== 'COLLECTING'"
            @click="pickVolume(record)"
          >
            开单
          </UiButton>
        </template>
      </template>
    </UiDataTable>
  </a-drawer>
</template>

<style scoped>
.kiosk-archive-pick__hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--nybc-text-secondary, #595959);
}
.kiosk-archive-pick__toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.kiosk-archive-pick__toolbar :deep(.ant-input-search) {
  flex: 1;
}
.kiosk-archive-pick__error {
  margin: 0 0 12px;
  color: #cf1322;
}
</style>
