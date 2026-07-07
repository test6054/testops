<template>
  <div id="archive-create-confirm" class="archive-create-step">
    <WorkbenchSurfaceCard flush class="archive-create-form">
      <template #head>
        <div class="archive-create-step__head">
          <h2 class="archive-create-step__title">确认创建</h2>
          <p class="archive-create-step__desc">请核对以下信息，确认无误后点击右上角「创建归档卷」。</p>
        </div>
      </template>
      <dl class="archive-create-summary archive-create-form__body">
        <div class="archive-create-summary__row">
          <dt>归档来源</dt>
          <dd>{{ sourceTypeText }}</dd>
        </div>
        <div class="archive-create-summary__row">
          <dt>课程</dt>
          <dd>{{ basicForm.courseName || '—' }}</dd>
        </div>
        <div class="archive-create-summary__row">
          <dt>归档标题</dt>
          <dd>{{ basicForm.archiveTitle || '—' }}</dd>
        </div>
        <div class="archive-create-summary__row">
          <dt>档案编号</dt>
          <dd>{{ basicForm.archiveNo.trim() || '自动生成' }}</dd>
        </div>
        <div class="archive-create-summary__row">
          <dt>学年</dt>
          <dd>{{ basicForm.academicYear?.trim() || '未设置' }}</dd>
        </div>
        <div class="archive-create-summary__row">
          <dt>学期</dt>
          <dd>{{ basicForm.semester ? formatSemester(basicForm.semester) : '未设置' }}</dd>
        </div>
        <div class="archive-create-summary__row">
          <dt>授课班级</dt>
          <dd>{{ basicForm.teachingClassName.trim() || '—' }}</dd>
        </div>
        <div class="archive-create-summary__row">
          <dt>院系</dt>
          <dd>{{ basicForm.departmentName.trim() || '—' }}</dd>
        </div>
        <div class="archive-create-summary__row">
          <dt>关联考试</dt>
          <dd>{{ basicForm.relatedExamName.trim() || '—' }}</dd>
        </div>
        <div class="archive-create-summary__row">
          <dt>考核形式</dt>
          <dd>{{ examFormText }}</dd>
        </div>
        <div class="archive-create-summary__row">
          <dt>成绩事实源</dt>
          <dd>{{ scoreSourceText }}</dd>
        </div>
        <div class="archive-create-summary__row">
          <dt>密级</dt>
          <dd>{{ securityLevelText }}</dd>
        </div>
        <div class="archive-create-summary__row">
          <dt>卷责任人</dt>
          <dd>{{ configForm.responsibleUserName || '—' }}</dd>
        </div>
        <div class="archive-create-summary__row">
          <dt>保管策略</dt>
          <dd>{{ retentionText }}</dd>
        </div>
      </dl>
      <p class="archive-create-form__hint">
        创建后将进入归档卷详情，按目录模板登记材料；线上阅卷主链卷仍由成绩发布自动建卷。
      </p>
    </WorkbenchSurfaceCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ArchiveExamFormDescription,
  ArchiveScoreSourceDescription,
  ArchiveSecurityLevelDescription,
} from '@/apis/mark/archive-volume'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { ArchiveVolumeSourceTypeDescription } from '@/types/enums/archive-volume-source-type-enum'
import { formatSemester } from '@/types/enums/semester-enum'
import {
  useInjectedArchiveVolumeSupplementBasicForm,
  useInjectedArchiveVolumeSupplementConfigForm,
} from './archive-volume-create-supplement-context'

const basicForm = useInjectedArchiveVolumeSupplementBasicForm()
const configForm = useInjectedArchiveVolumeSupplementConfigForm()

const sourceTypeText = computed(() => ArchiveVolumeSourceTypeDescription[configForm.sourceType])

const examFormText = computed(() =>
  configForm.examForm ? ArchiveExamFormDescription[configForm.examForm] : '—',
)

const scoreSourceText = computed(() => ArchiveScoreSourceDescription[configForm.scoreSource])

const securityLevelText = computed(() => ArchiveSecurityLevelDescription[configForm.securityLevel])

const retentionText = computed(() =>
  configForm.permanentRetention ? '永久保管' : `${configForm.retentionYears} 年`,
)
</script>

<style scoped lang="scss">
.archive-create-summary {
  margin: 0;
  display: grid;
  gap: 12px 24px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  max-width: 880px;

  &__row {
    display: grid;
    grid-template-columns: 88px minmax(0, 1fr);
    gap: 12px;
    align-items: baseline;
    font-size: 14px;
    line-height: 1.5;
  }

  dt {
    margin: 0;
    color: var(--dp-text-secondary, #64748b);
  }

  dd {
    margin: 0;
    color: var(--dp-text-primary, #0f172a);
    font-weight: 500;
  }
}

.archive-create-form__hint {
  margin-top: 20px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dp-text-secondary, #64748b);
  max-width: 880px;
}

@media (max-width: 767px) {
  .archive-create-summary {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
