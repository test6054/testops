import type { ArchiveVolumeDetailResponse, ArchiveVolumeResponse } from '@/apis/mark/archive-volume'
import { formatSemester } from '@/types/enums/semester-enum'

export interface ArchiveVolumeSelectOption {
  value: string
  label: string
}

export function formatArchiveVolumeOptionLabel(
  volume: Pick<ArchiveVolumeResponse, 'archiveTitle' | 'archiveNo'>,
): string {
  const title = volume.archiveTitle?.trim() || volume.archiveNo
  if (!volume.archiveNo || volume.archiveNo === title) {
    return title
  }
  return `${title} (${volume.archiveNo})`
}

export function formatArchiveVolumeAcademicTerm(
  volume: Pick<ArchiveVolumeResponse, 'academicYear' | 'semester'>,
): string {
  return [volume.academicYear, formatSemester(volume.semester)].filter(Boolean).join(' · ')
}

export function toArchiveVolumeSelectOption(volume: ArchiveVolumeResponse): ArchiveVolumeSelectOption {
  return {
    value: volume.volumeId,
    label: [formatArchiveVolumeOptionLabel(volume), formatArchiveVolumeAcademicTerm(volume)]
      .filter(Boolean)
      .join(' · '),
  }
}

/** 详情转列表项，供顶栏切换器补全当前卷标签 */
export function archiveVolumeSummaryFromDetail(
  detail: ArchiveVolumeDetailResponse,
): ArchiveVolumeResponse {
  return detail.volume
}
