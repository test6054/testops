import type { ArchiveVolumePageRequest, ArchiveVolumeVO } from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed, ref } from 'vue'
import { getDefaultAcademicYearAndSemester } from '@/utils/academic-year'

export type ArchiveVolumeListTabKey = 'mine' | 'college' | 'archive'

export type ArchiveVolumeScenarioKey
  = | 'collecting-materials'
    | 'catalog-pending'
    | 'submit-ready'
    | 'remediation-open'
    | 'pending-review'
    | 'term-not-stored'

export interface ArchiveVolumeFilterPreset {
  key: ArchiveVolumeScenarioKey
  label: string
  tone: BadgeTone
  tabs: ArchiveVolumeListTabKey[]
  buildRequest: (ctx: ArchiveVolumeFilterPresetContext) => Partial<ArchiveVolumePageRequest>
  matchRow?: (row: ArchiveVolumeVO) => boolean
}

export interface ArchiveVolumeFilterPresetContext {
  listTab: ArchiveVolumeListTabKey
}

const ARCHIVE_VOLUME_FILTER_PRESETS: ArchiveVolumeFilterPreset[] = [
  {
    key: 'collecting-materials',
    label: '待收齐',
    tone: 'orange',
    tabs: ['mine'],
    buildRequest: (ctx) => ({
      mineOnly: ctx.listTab === 'mine' ? true : undefined,
      volumeStatus: 'COLLECTING',
      integrityFailedOnly: true,
    }),
  },
  {
    key: 'catalog-pending',
    label: '待编目',
    tone: 'blue',
    tabs: ['mine', 'college'],
    buildRequest: () => ({
      volumeStatus: 'COLLECTING',
      integrityStatus: 'PASSED',
    }),
    matchRow: (row) =>
      row.volumeStatus === 'COLLECTING'
      && (row.integrityStatus === 'PASSED' || row.integrityStatus === 'WAIVED')
      && row.submitReady !== true
      && row.hasOpenRemediationTask !== true,
  },
  {
    key: 'submit-ready',
    label: '可提交',
    tone: 'green',
    tabs: ['mine', 'college'],
    buildRequest: () => ({
      volumeStatus: 'COLLECTING',
    }),
    matchRow: (row) => row.volumeStatus === 'COLLECTING' && row.submitReady === true,
  },
  {
    key: 'remediation-open',
    label: '整改中',
    tone: 'orange',
    tabs: ['mine', 'college'],
    buildRequest: (ctx) => ({
      mineOnly: ctx.listTab === 'mine' ? true : undefined,
      volumeStatus: 'COLLECTING',
    }),
    matchRow: (row) => row.hasOpenRemediationTask === true,
  },
  {
    key: 'pending-review',
    label: '待我验收',
    tone: 'purple',
    tabs: ['archive'],
    buildRequest: () => ({
      volumeStatus: 'SUBMITTED',
      transferStatus: 'PENDING_REVIEW',
    }),
  },
  {
    key: 'term-not-stored',
    label: '本学期未入库',
    tone: 'red',
    tabs: ['college'],
    buildRequest: () => {
      const { academicYear, semester } = getDefaultAcademicYearAndSemester()
      return {
        academicYear,
        semester,
      }
    },
    matchRow: (row) => row.volumeStatus !== 'STORED',
  },
]

export function useArchiveVolumeFilterPresets(listTab: () => ArchiveVolumeListTabKey) {
  const activeScenario = ref<ArchiveVolumeScenarioKey | null>(null)

  const visiblePresets = computed(() => {
    const tab = listTab()
    return ARCHIVE_VOLUME_FILTER_PRESETS.filter((item) => item.tabs.includes(tab))
  })

  const activePreset = computed(
    () => visiblePresets.value.find((item) => item.key === activeScenario.value) ?? null,
  )

  function selectScenario(key: ArchiveVolumeScenarioKey | null) {
    activeScenario.value = activeScenario.value === key ? null : key
  }

  function clearScenario() {
    activeScenario.value = null
  }

  function buildScenarioRequest(): Partial<ArchiveVolumePageRequest> {
    const preset = activePreset.value
    if (!preset) return {}
    return preset.buildRequest({ listTab: listTab() })
  }

  function filterScenarioRows(rows: ArchiveVolumeVO[]): ArchiveVolumeVO[] {
    const preset = activePreset.value
    if (!preset?.matchRow) return rows
    return rows.filter(preset.matchRow)
  }

  return {
    activeScenario,
    visiblePresets,
    activePreset,
    selectScenario,
    clearScenario,
    buildScenarioRequest,
    filterScenarioRows,
  }
}
