<template>
  <section id="exam-create-basic" class="form-section exam-create-form">
    <header class="section-header">
      <h2 class="section-title">考务信息</h2>
    </header>
    <a-form ref="formRef" :model="examForm" :rules="basicRules" layout="vertical">
      <a-form-item label="课程" name="courseId">
        <CatalogCourseSelector
          v-model:value="examForm.courseId"
          placeholder="选择课程"
          :allow-clear="false"
          @change="handleCourseChange"
        />
      </a-form-item>
      <a-form-item label="考试名称" name="examName">
        <a-input
          v-model:value="examForm.examName"
          placeholder="例如：2026 春《工程制图》期末"
          :maxlength="100"
          show-count
        />
      </a-form-item>
      <a-form-item label="考务编号" name="examNo">
        <a-input
          v-model:value="examForm.examNo"
          placeholder="教务系统编号或自定义编号"
          :maxlength="64"
        />
      </a-form-item>
      <a-form-item label="学年" name="academicYear">
        <a-input v-model:value="examForm.academicYear" placeholder="2024-2025" :maxlength="9" />
      </a-form-item>
      <a-form-item label="学期" name="semester">
        <a-select
          v-model:value="examForm.semester"
          placeholder="选择学期"
          allow-clear
          :options="SemesterOptions"
        />
      </a-form-item>
      <a-form-item label="考试时间窗" name="examWindow">
        <a-range-picker
          v-model:value="examForm.examWindow"
          style="width: 100%"
          show-time
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DD HH:mm:ss"
          :placeholder="['开始时间', '结束时间']"
        />
      </a-form-item>
      <a-form-item label="阅卷策略" name="gradingStrategy">
        <a-input :value="GRADING_STRATEGY_LABEL.SINGLE" disabled />
      </a-form-item>
      <a-form-item label="成绩构成" name="scoreCompositionMode">
        <a-radio-group v-model:value="examForm.scoreCompositionMode">
          <a-radio value="EXAM_ONLY">仅计入考试成绩（期末笔试）</a-radio>
          <a-radio value="EXAM_WITH_DAILY">期末考试 + 平时成绩合成</a-radio>
        </a-radio-group>
        <div class="exam-create-form__hint">
          平时成绩指出勤、作业、课堂表现等；选择合成后，成绩确认时需为每位考生录入平时分。
        </div>
      </a-form-item>
      <a-form-item
        v-if="examForm.scoreCompositionMode === 'EXAM_WITH_DAILY'"
        label="平时成绩满分"
        name="dailyScoreFull"
      >
        <a-input-number
          v-model:value="examForm.dailyScoreFull"
          :min="0.01"
          :max="1000"
          :precision="2"
          style="width: 100%"
          placeholder="例如 30"
        />
      </a-form-item>
      <a-form-item label="备注" name="remark">
        <a-textarea
          v-model:value="examForm.remark"
          :rows="3"
          placeholder="可填写考试用途、班级范围说明等"
          :maxlength="500"
          show-count
        />
      </a-form-item>
    </a-form>
  </section>
</template>

<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { CourseListVO } from '@/apis/quality/user-catalog'
import type { ExamBasicForm } from './useExamCreate'
import { onMounted, ref, watch } from 'vue'
import { GRADING_STRATEGY_LABEL } from '@/apis/mark/exam'
import CatalogCourseSelector from '@/components/quality/selectors/CatalogCourseSelector.vue'
import { SemesterOptions } from '@/types/enums/semester-enum'

const props = defineProps<{
  examForm: ExamBasicForm
  basicRules: Record<string, Rule[]>
}>()

const emit = defineEmits<{
  'update:basic-form-ref': [ref: FormInstance | undefined]
  'course-change': [courseId: string | null, courseName: string]
}>()

const formRef = ref<FormInstance>()

function handleCourseChange(courseId: string | null, option?: CourseListVO): void {
  emit('course-change', courseId, option?.courseName?.trim() ?? '')
}

onMounted(() => {
  emit('update:basic-form-ref', formRef.value)
})

watch(formRef, (value) => {
  emit('update:basic-form-ref', value)
})
</script>

<style scoped lang="scss">
.exam-create-form__hint {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dp-text-secondary, #64748b);
}
</style>
