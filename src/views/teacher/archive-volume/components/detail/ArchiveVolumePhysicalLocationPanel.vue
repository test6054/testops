<script setup lang="ts">
import type { ArchivePhysicalLocationVO, ArchiveVolumeDetailVO } from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref, watch } from 'vue'
import {
  listArchivePhysicalLocationHistory,
  updateArchiveVolumePhysicalLocation,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import { showUserError } from '@/utils/error-handler'

const props = defineProps<{
  volumeId: string
  detail: ArchiveVolumeDetailVO
  canEdit: boolean
}>()

const emit = defineEmits<{
  refreshed: []
}>()

const submitting = ref(false)
const historyLoading = ref(false)
const locationHistory = ref<ArchivePhysicalLocationVO[]>([])
const form = reactive({
  building: '',
  room: '',
  cabinet: '',
  slot: '',
  physicalLocationNote: '',
})

function applyStructuredLocation(source: {
  building?: string
  room?: string
  cabinet?: string
  slot?: string
  physicalLocationNote?: string
}) {
  form.building = source.building ?? ''
  form.room = source.room ?? ''
  form.cabinet = source.cabinet ?? ''
  form.slot = source.slot ?? ''
  form.physicalLocationNote = source.physicalLocationNote ?? ''
}

watch(
  () => props.detail.volume,
  (volume) => {
    applyStructuredLocation({
      building: volume.physicalBuilding,
      room: volume.physicalRoom,
      cabinet: volume.physicalCabinet,
      slot: volume.physicalSlot,
      physicalLocationNote: volume.physicalLocationNote,
    })
  },
  { immediate: true },
)

async function loadLocationHistory() {
  historyLoading.value = true
  try {
    locationHistory.value = await listArchivePhysicalLocationHistory({
      volumeId: props.volumeId,
      limit: 20,
    })
    if (!form.building && !form.cabinet && locationHistory.value.length > 0) {
      const latest = locationHistory.value[0]
      applyStructuredLocation({
        building: latest.building,
        room: latest.room,
        cabinet: latest.cabinet,
        slot: latest.slot,
        physicalLocationNote: props.detail.volume.physicalLocationNote,
      })
    }
  } catch (error) {
    showUserError(error)
    locationHistory.value = []
  } finally {
    historyLoading.value = false
  }
}

async function handleSave() {
  const building = form.building.trim()
  const cabinet = form.cabinet.trim()
  if (!building || !cabinet) {
    message.warning('请填写楼宇与柜号')
    return
  }
  submitting.value = true
  try {
    await updateArchiveVolumePhysicalLocation({
      volumeId: props.volumeId,
      building,
      room: form.room.trim() || undefined,
      cabinet,
      slot: form.slot.trim() || undefined,
      physicalLocationNote: form.physicalLocationNote.trim() || undefined,
    })
    message.success('柜位已更新')
    emit('refreshed')
    await loadLocationHistory()
  } catch (error) {
    showUserError(error)
  } finally {
    submitting.value = false
  }
}

function formatStructuredLocation(
  item: Pick<ArchivePhysicalLocationVO, 'building' | 'room' | 'cabinet' | 'slot'>,
) {
  return [item.building, item.room, item.cabinet, item.slot].filter(Boolean).join(' / ')
}

function formatLocationLabel(item: ArchivePhysicalLocationVO) {
  const structured = formatStructuredLocation(item)
  return structured || '—'
}

onMounted(() => {
  void loadLocationHistory()
})
</script>

<template>
  <section class="archive-volume-physical-location">
    <p class="archive-volume-physical-location__hint">
      结构化库位用于扫描室派单排序；仅收集中卷可修改，每次变更写入库位历史。
    </p>
    <a-form layout="vertical" class="archive-volume-physical-location__form">
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="楼宇/库区" required>
            <a-input v-model:value="form.building" placeholder="例如 A区" :disabled="!canEdit" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="房间/库室">
            <a-input v-model:value="form.room" placeholder="例如 03室" :disabled="!canEdit" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="柜号" required>
            <a-input v-model:value="form.cabinet" placeholder="例如 03柜" :disabled="!canEdit" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="层/格位">
            <a-input v-model:value="form.slot" placeholder="例如 2层" :disabled="!canEdit" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="柜位说明">
        <a-input
          v-model:value="form.physicalLocationNote"
          placeholder="可选补充说明"
          :disabled="!canEdit"
        />
      </a-form-item>
      <UiButton
        v-if="canEdit"
        size="sm"
        variant="primary"
        :loading="submitting"
        @click="handleSave"
      >
        保存柜位
      </UiButton>
      <p v-else class="archive-volume-physical-location__readonly">当前卷状态不允许修改柜位</p>
    </a-form>
    <section class="archive-volume-physical-location__timeline">
      <h3>柜位变更记录</h3>
      <a-skeleton v-if="historyLoading" active :paragraph="{ rows: 3 }" />
      <ul v-else-if="locationHistory.length > 0" class="archive-volume-physical-location__list">
        <li v-for="item in locationHistory" :key="item.locationId">
          <div class="archive-volume-physical-location__list-top">
            <strong>{{ formatLocationLabel(item) }}</strong>
            <span>{{ item.effectiveTime || '—' }}</span>
          </div>
          <p v-if="item.note">{{ item.note }}</p>
        </li>
      </ul>
      <p v-else class="archive-volume-physical-location__empty">暂无柜位变更记录</p>
    </section>
  </section>
</template>

<style scoped>
.archive-volume-physical-location__hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--nybc-text-secondary, #595959);
}
.archive-volume-physical-location__form {
  max-width: 560px;
}
.archive-volume-physical-location__readonly {
  margin: 0;
  font-size: 13px;
  color: var(--nybc-text-secondary, #8c8c8c);
}
.archive-volume-physical-location__timeline {
  margin-top: 24px;
  max-width: 560px;
}
.archive-volume-physical-location__timeline h3 {
  margin: 0 0 12px;
  font-size: 15px;
}
.archive-volume-physical-location__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
}
.archive-volume-physical-location__list-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
}
.archive-volume-physical-location__list p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--nybc-text-secondary, #8c8c8c);
}
.archive-volume-physical-location__empty {
  margin: 0;
  font-size: 13px;
  color: var(--nybc-text-secondary, #8c8c8c);
}
</style>
