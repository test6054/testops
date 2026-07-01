<template>
  <section id="archive-create-confirm" class="form-section archive-create-form">
    <header class="section-header">
      <h2 class="section-title">确认创建</h2>
    </header>
    <p class="section-desc">请核对以下信息，确认无误后点击右上角「创建归档卷」。</p>
    <dl class="archive-create-summary">
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
        <dt>学年学期</dt>
        <dd>{{ academicTermText }}</dd>
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
        <dt>目录模板套</dt>
        <dd>{{ configForm.templateSetName || configForm.templateSetCode || '—' }}</dd>
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
      创建后将进入归档卷详情，按所选模板套登记材料并执行完整性检查。
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ARCHIVE_EXAM_FORM_LABEL,
  ARCHIVE_SCORE_SOURCE_LABEL,
  ARCHIVE_SECURITY_LEVEL_LABEL,
} from '@/apis/mark/archive-volume'
import { formatSemester } from '@/types/enums/semester-enum'
import {
  useInjectedArchiveVolumeCreateBasicForm,
  useInjectedArchiveVolumeCreateConfigForm,
} from './archive-volume-create-context'

const basicForm = useInjectedArchiveVolumeCreateBasicForm()
const configForm = useInjectedArchiveVolumeCreateConfigForm()

const academicTermText = computed(() => {
  const year = basicForm.academicYear?.trim()
  const semester = basicForm.semester
  if (!year && !semester) return '未设置'
  if (!year || !semester) return '学年学期不完整'
  return `${year} ${formatSemester(semester)}`
})

const examFormText = computed(() =>
  configForm.examForm ? ARCHIVE_EXAM_FORM_LABEL[configForm.examForm] : '—',
)

const scoreSourceText = computed(() => ARCHIVE_SCORE_SOURCE_LABEL[configForm.scoreSource])

const securityLevelText = computed(() => ARCHIVE_SECURITY_LEVEL_LABEL[configForm.securityLevel])

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
