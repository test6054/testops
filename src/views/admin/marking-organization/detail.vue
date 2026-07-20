<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="
          isJourneyChrome ? contextBarTitle : organization ? organizationExamLabel : '阅卷组织详情'
        "
        :subtitle="isJourneyChrome ? contextBarSubtitle : '阅卷安排'"
      >
        <template #status>
          <UiTag v-if="isJourneyChrome && examStatusLabel" :tone="examStatusTone" size="sm">
            {{ examStatusLabel }}
          </UiTag>
          <UiTag
            v-if="organization"
            :tone="
              strictEnumTone(
                MARKING_ORGANIZATION_STATUS_TONE,
                organization.organizationStatus,
                '阅卷组织状态',
              )
            "
            size="sm"
          >
            {{
              strictEnumLabel(
                MarkingOrganizationStatusDescription,
                organization.organizationStatus,
                '阅卷组织状态',
              )
            }}
          </UiTag>
          <UiTag v-if="organization" tone="blue" size="sm">
            题组 {{ organization.groups.length }}
          </UiTag>
          <UiTag v-if="organization?.anonymousMode" tone="green" size="sm">匿名阅卷</UiTag>
        </template>
        <template #actions>
          <UiButton v-if="canManageExamOwner" variant="primary" size="sm" @click="goFormalSessions">
            正评会话
          </UiButton>
          <UiButton
            v-if="organization && canManageExamOwner"
            variant="outline"
            size="sm"
            @click="openEditDrawer"
          >
            编辑组织
          </UiButton>
          <UiButton variant="outline" size="sm" @click="goTrialSessions"> 试评定标 </UiButton>
          <UiDropdownAction
            v-if="organization && canManageExamOwner"
            trigger-style="button"
            button-text="更多"
            :items="orgDetailMoreActionItems"
            @select="onOrgDetailMoreAction"
          />
        </template>
      </ContextBar>
    </template>

    <template v-if="organization" #signal>
      <SignalBand compact variant="panel" :metrics="orgSignalMetrics" />
    </template>

    <ExamWorkspaceJourneySubNav v-if="isExamWorkspaceRoute" />

    <UiSkeletonState v-if="loading && !organization" variant="card" compact />

    <WorkbenchContextGateStrip
      v-else-if="!organization"
      tag="缺少上下文"
      body="未找到阅卷组织，请从阅卷安排重新进入"
      cta-label="返回阅卷安排"
      list-route-name="TeacherExamWorkspaceMarkingOrg"
      class="org-detail__empty"
    />

    <template v-else-if="organization">
      <template v-if="isExamWorkspaceRoute">
        <UiAlertStrip
          v-if="layoutRoiGap > 0"
          tone="warning"
          class="org-detail__readonly-banner"
          :title="`制卷识别区域未就绪（${layoutRoiGap} 道题）`"
          description="未配置 ROI 的题目无法分配题组、按题导出或生成按题学情，请先在制卷工作台补全识别区域。"
        />
        <UiAlertStrip
          v-if="!canManageExamOwner"
          tone="info"
          class="org-detail__readonly-banner"
          title="当前为只读视图"
          description="题组、策略与正评启动由考试主考老师配置。"
        />

        <MarkingOrgAssignmentTable
          class="org-workbench__assignment"
          :groups="groups"
          :allocation-policies="allocationPolicies"
          :can-manage="canManageExamOwner"
          @create-group="openGroupModal"
          @edit-group="openGroupEditById"
        />

        <div class="org-workbench__grid">
          <MarkingOrgGroupProgressList
            :groups="groups"
            :group-progress-by-id="groupProgressById"
            :can-manage="canManageExamOwner"
            @edit-group="openGroupEditById"
          />
          <MarkingOrgStrategySummaryCard
            :allocation-policy="orgDefaultAllocationPolicy"
            :recycle-policy="orgDefaultRecyclePolicy"
            :can-manage="canManageExamOwner"
            @edit-policy="openPolicyDrawer"
          />
        </div>

        <MarkingOrgReviewerRosterTable
          :groups="groups"
          :reviewer-metrics="reviewerMetrics"
          :loading="reviewerMetricsLoading"
          @refresh="loadWorkbenchPanels"
        />

        <WorkbenchSurfaceCard v-if="canReassignRecycledTasks" flush class="org-detail__secondary">
          <template #head>回收待分配</template>
          <RecycledTaskReassignPanel
            :exam-id="examId"
            :groups="groups"
            :view-all-recycled="canViewAllRecycledTasks"
            :leader-group-ids="leaderGroupIds"
            :can-reassign="canReassignRecycledTasks"
          />
        </WorkbenchSurfaceCard>
      </template>

      <WorkbenchSurfaceCard v-else flush class="org-detail__surface">
        <UiAlertStrip
          v-if="!canManageExamOwner"
          tone="info"
          class="org-detail__readonly-banner"
          title="当前为只读视图"
          description="题组、策略与正评启动由考试主考老师配置。"
        />
        <template #head>
          <UiSectionTabs v-model="activeTab" :items="detailTabItems" compact divided />
        </template>

        <template v-if="activeTab === 'info'">
          <section class="org-detail__info">
            <h4 class="org-detail__info-title">基本信息</h4>
            <UiInfoGrid :columns="3">
              <UiInfoGridItem label="当前考试">
                {{ organizationExamLabel }}
              </UiInfoGridItem>
              <UiInfoGridItem label="主考老师">
                {{ organization.leaderUserName }}（{{ organization.leaderTeacherNo }}）
              </UiInfoGridItem>
              <UiInfoGridItem label="题组数量">
                {{ organization.groups.length }} 组
              </UiInfoGridItem>
              <UiInfoGridItem label="匿名阅卷">
                <UiTag :tone="organization.anonymousMode ? 'green' : 'gray'" size="sm">
                  {{ organization.anonymousMode ? '启用' : '关闭' }}
                </UiTag>
              </UiInfoGridItem>
              <UiInfoGridItem label="创建时间">
                {{ formatDateTime(organization.createTime) }}
              </UiInfoGridItem>
              <UiInfoGridItem label="更新时间">
                {{ formatDateTime(organization.updateTime) }}
              </UiInfoGridItem>
            </UiInfoGrid>
            <div class="org-detail__remark">
              <span class="org-detail__remark-label">备注</span>
              <span class="org-detail__remark-value">
                {{ organization.remark || '未填写组织备注' }}
              </span>
            </div>
          </section>

          <UiDataTable
            title="题组列表"
            pagination-mode="none"
            :columns="groupColumns"
            :data-source="filteredGroups"
            row-key="id"
            size="middle"
            :show-pagination="false"
            flat
            :total="filteredGroups.length"
            :sorted-info="groupTableSortedInfo"
            :empty-description="groupTableEmptyDescription"
            class="group-table org-detail__group-table"
          >
            <template #toolbar-left>
              <UiSearchBox
                v-model="groupSearchKeyword"
                class="org-detail__group-search"
                placeholder="搜索题组名称、组长、阅卷教师、题号"
                size="small"
              />
            </template>
            <template v-if="canManageExamOwner" #toolbar-right>
              <UiButton variant="primary" size="sm" @click="openGroupModal">
                <template #icon><PlusOutlined /></template>
                新建题组
              </UiButton>
            </template>
            <template v-if="canManageExamOwner" #empty-action>
              <UiButton variant="primary" size="sm" @click="openGroupModal">
                <template #icon><PlusOutlined /></template>
                新建题组
              </UiButton>
            </template>
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'groupName'">
                <UiTypographyText strong>
                  {{ record.groupName }}
                </UiTypographyText>
              </template>
              <template v-else-if="column.key === 'questions'">
                <div class="group-table__stack">
                  <UiTag tone="blue" size="sm"> {{ record.questions.length }} 题 </UiTag>
                  <span
                    v-for="question in record.questions.slice(0, 3)"
                    :key="question.layoutQuestionId"
                    class="group-table__item"
                  >
                    第 {{ question.questionNo }} 题 · {{ question.questionTypeMessage }} ·
                    {{ question.fullScore }} 分
                  </span>
                  <span v-if="record.questions.length > 3" class="group-table__more">
                    另 {{ record.questions.length - 3 }} 题
                  </span>
                </div>
              </template>
              <template v-else-if="column.key === 'reviewers'">
                <div class="group-table__stack">
                  <UiTag tone="blue" size="sm"> {{ record.reviewers.length }} 人 </UiTag>
                  <span
                    v-for="reviewer in record.reviewers.slice(0, 3)"
                    :key="reviewer.reviewerUserId"
                    class="group-table__item"
                  >
                    {{ reviewer.reviewerUserName }}（{{ reviewer.reviewerTeacherNo }}）
                  </span>
                  <span v-if="record.reviewers.length > 3" class="group-table__more">
                    另 {{ record.reviewers.length - 3 }} 人
                  </span>
                </div>
              </template>
              <template v-else-if="column.key === 'leaderUser'">
                {{ record.leaderUserName }}（{{ record.leaderTeacherNo }}）
              </template>
              <template v-else-if="column.key === 'groupStatus'">
                <UiTag :tone="groupStatusTone(record.groupStatus)" size="sm">
                  {{ groupStatusLabel(record.groupStatus) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'createTime'">
                {{ formatDateTime(record.createTime) }}
              </template>
              <template v-else-if="column.key === 'action'">
                <UiTableActions
                  :items="[
                    { key: 'edit', label: '编辑', hidden: !canEditGroup(record) },
                    {
                      key: 'delete',
                      label: '删除',
                      tone: 'danger',
                      hidden: !canDeleteGroup(record),
                    },
                    { key: 'close', label: '关闭', hidden: !canCloseGroup(record) },
                  ]"
                  split
                  @action="(key) => handleGroupRowAction(key, record)"
                />
              </template>
            </template>
          </UiDataTable>
        </template>

        <template v-else-if="activeTab === 'policy'">
          <UiForm
            v-if="canManageExamOwner"
            :model="policyForm"
            layout="vertical"
            class="policy-form"
          >
            <UiRow :gutter="16">
              <UiCol :xs="24" :lg="12">
                <h4 class="subsection-title">任务分配策略</h4>
                <UiFormItem label="策略适用范围">
                  <UiSelect
                    size="sm"
                    v-model="policyForm.allocationGroupId"
                    placeholder="选择题组（留空表示组织级默认）"
                    :options="groupSelectOptions"
                    allow-clear
                    :disabled="!canManageExamOwner"
                  />
                </UiFormItem>
                <UiFormItem label="分配模式" required>
                  <UiSelect
                    size="sm"
                    v-model="policyForm.allocationMode"
                    :options="MARKING_ALLOCATION_MODE_OPTIONS"
                    :disabled="!canManageExamOwner"
                  />
                </UiFormItem>
                <UiFormItem label="批阅任务单元" required>
                  <UiSelect
                    size="sm"
                    v-model="policyForm.allocationUnit"
                    :options="ALLOCATION_UNIT_OPTIONS"
                    :disabled="!canManageExamOwner"
                  />
                </UiFormItem>
                <UiFormItem label="匿名模式" required>
                  <UiSelect
                    size="sm"
                    v-model="policyForm.anonymityMode"
                    :options="effectiveAnonymityModeOptions"
                    :disabled="true"
                  />
                  <div class="policy-hint">
                    匿名模式由阅卷组织主配置统一裁决，题组策略只继承当前组织模式。
                  </div>
                </UiFormItem>
                <UiFormItem
                  v-if="policyForm.allocationUnit === AllocationUnitCode.RANDOM_QUESTIONS"
                  label="随机题目抽样数量"
                  required
                >
                  <UiInputNumber
                    size="sm"
                    v-model="policyForm.randomQuestionSampleSize"
                    :min="1"
                    :max="100"
                    style="width: 100%"
                    :disabled="!canManageExamOwner"
                  />
                  <div class="policy-hint">
                    抽样题池来自当前题组题目范围；正评启动后会固化本次随机抽题结果，后续可在正评会话列表审计复盘。
                  </div>
                </UiFormItem>
                <UiFormItem label="每批分配任务数">
                  <UiInputNumber
                    size="sm"
                    v-model="policyForm.batchSize"
                    :min="1"
                    :max="500"
                    style="width: 100%"
                    :disabled="!canManageExamOwner"
                  />
                </UiFormItem>
                <UiFormItem label="教师最大待处理任务数">
                  <UiInputNumber
                    size="sm"
                    v-model="policyForm.loadLimit"
                    :min="1"
                    :max="500"
                    style="width: 100%"
                    :disabled="!canManageExamOwner"
                  />
                </UiFormItem>
                <UiFormItem label="匿名令牌策略">
                  <UiSelect
                    size="sm"
                    v-model="policyForm.anonymousTokenPolicy"
                    :options="ANONYMOUS_TOKEN_POLICY_OPTIONS"
                    allow-clear
                    :disabled="!canManageExamOwner"
                  />
                </UiFormItem>
                <UiButton
                  size="sm"
                  variant="primary"
                  v-if="canManageExamOwner"
                  :loading="savingAllocation"
                  @click="submitAllocation"
                >
                  <template #icon><SaveOutlined /></template>
                  保存分配策略
                </UiButton>
              </UiCol>

              <UiCol :xs="24" :lg="12">
                <h4 class="subsection-title">任务回收策略</h4>
                <UiFormItem label="策略适用范围">
                  <UiSelect
                    size="sm"
                    v-model="policyForm.recycleGroupId"
                    placeholder="选择题组（留空表示组织级默认）"
                    :options="groupSelectOptions"
                    allow-clear
                    :disabled="!canManageExamOwner"
                  />
                </UiFormItem>
                <UiFormItem label="超时时间（分钟）">
                  <UiInputNumber
                    size="sm"
                    v-model="policyForm.timeoutMinutes"
                    :min="1"
                    :max="1440"
                    style="width: 100%"
                    :disabled="!canManageExamOwner"
                  />
                </UiFormItem>
                <UiFormItem label="教师最大待处理任务数">
                  <UiInputNumber
                    size="sm"
                    v-model="policyForm.maxPendingCount"
                    :min="1"
                    :max="500"
                    style="width: 100%"
                    :disabled="!canManageExamOwner"
                  />
                </UiFormItem>
                <UiFormItem label="再分配模式">
                  <UiSelect
                    size="sm"
                    v-model="policyForm.reassignMode"
                    :options="MARKING_REASSIGN_MODE_OPTIONS"
                    allow-clear
                    :disabled="!canManageExamOwner"
                  />
                </UiFormItem>
                <UiButton
                  variant="primary"
                  size="sm"
                  v-if="canManageExamOwner"
                  :loading="savingRecycle"
                  @click="submitRecycle"
                >
                  <template #icon><SaveOutlined /></template>
                  保存回收策略
                </UiButton>
              </UiCol>
            </UiRow>
          </UiForm>
          <UiRow v-else :gutter="16" class="policy-form">
            <UiCol :xs="24" :lg="12">
              <h4 class="subsection-title">任务分配策略</h4>
              <UiDescriptions bordered size="small" :column="1">
                <UiDescriptionsItem label="策略适用范围">
                  {{ policyScopeLabel(policyForm.allocationGroupId) }}
                </UiDescriptionsItem>
                <UiDescriptionsItem label="分配模式">
                  {{
                    policyOptionLabel(MARKING_ALLOCATION_MODE_OPTIONS, policyForm.allocationMode)
                  }}
                </UiDescriptionsItem>
                <UiDescriptionsItem label="批阅任务单元">
                  {{ policyOptionLabel(ALLOCATION_UNIT_OPTIONS, policyForm.allocationUnit) }}
                </UiDescriptionsItem>
                <UiDescriptionsItem label="匿名模式">
                  {{ policyOptionLabel(ANONYMITY_MODE_OPTIONS, policyForm.anonymityMode) }}
                </UiDescriptionsItem>
                <UiDescriptionsItem
                  v-if="policyForm.allocationUnit === AllocationUnitCode.RANDOM_QUESTIONS"
                  label="随机题目抽样数量"
                >
                  {{ policyForm.randomQuestionSampleSize ?? '—' }}
                </UiDescriptionsItem>
                <UiDescriptionsItem label="每批分配任务数">
                  {{ policyForm.batchSize }}
                </UiDescriptionsItem>
                <UiDescriptionsItem label="教师最大待处理任务数">
                  {{ policyForm.loadLimit }}
                </UiDescriptionsItem>
                <UiDescriptionsItem label="匿名令牌策略">
                  {{
                    policyOptionLabel(
                      ANONYMOUS_TOKEN_POLICY_OPTIONS,
                      policyForm.anonymousTokenPolicy,
                    )
                  }}
                </UiDescriptionsItem>
              </UiDescriptions>
            </UiCol>
            <UiCol :xs="24" :lg="12">
              <h4 class="subsection-title">任务回收策略</h4>
              <UiDescriptions bordered size="small" :column="1">
                <UiDescriptionsItem label="策略适用范围">
                  {{ policyScopeLabel(policyForm.recycleGroupId) }}
                </UiDescriptionsItem>
                <UiDescriptionsItem label="超时时间（分钟）">
                  {{ policyForm.timeoutMinutes ?? '—' }}
                </UiDescriptionsItem>
                <UiDescriptionsItem label="教师最大待处理任务数">
                  {{ policyForm.maxPendingCount ?? '—' }}
                </UiDescriptionsItem>
                <UiDescriptionsItem label="再分配模式">
                  {{ policyOptionLabel(MARKING_REASSIGN_MODE_OPTIONS, policyForm.reassignMode) }}
                </UiDescriptionsItem>
              </UiDescriptions>
            </UiCol>
          </UiRow>
        </template>

        <template v-else-if="activeTab === 'recycled'">
          <RecycledTaskReassignPanel
            :exam-id="examId"
            :groups="groups"
            :view-all-recycled="canViewAllRecycledTasks"
            :leader-group-ids="leaderGroupIds"
            :can-reassign="canReassignRecycledTasks"
          />
        </template>
      </WorkbenchSurfaceCard>
    </template>

    <UiDialog
      v-model:open="groupModalOpen"
      :title="groupModalTitle"
      :width="640"
      :confirm-loading="savingGroup"
      ok-text="提交"
      @ok="submitGroup"
    >
      <template #footer>
        <UiButton size="sm" variant="outline" @click="groupModalOpen = false">取消</UiButton>
        <UiButton variant="primary" size="sm" :loading="savingGroup" @click="submitGroup">
          提交
        </UiButton>
      </template>
      <UiForm ref="groupFormRef" :model="groupForm" :rules="groupRules" layout="vertical">
        <UiFormItem label="题组名称" name="groupName" required>
          <UiInput
            size="sm"
            v-model="groupForm.groupName"
            placeholder="例如：第一题组（选择题）"
            :maxlength="50"
          />
        </UiFormItem>
        <UiFormItem label="题组组长" name="leaderUserId" required>
          <UiSelect
            size="sm"
            v-model="groupForm.leaderUserId"
            allow-search
            :filter-option="false"
            :options="teacherOptions"
            :loading="teacherLoading"
            placeholder="从教师中选择"
            @search="onTeacherSearch"
          />
        </UiFormItem>
        <UiFormItem
          v-if="!groupForm.wholePaperGroup"
          label="负责题目"
          name="layoutQuestionIds"
          required
        >
          <UiSelect
            size="sm"
            v-model="groupForm.layoutQuestionIds"
            mode="multiple"
            :options="questionOptions"
            :loading="templateLoading"
            placeholder="选择该题组负责的题目"
            option-filter-prop="label"
            allow-search
          />
        </UiFormItem>
        <UiFormItem label="阅卷教师" name="reviewerUserIds" required>
          <UiSelect
            size="sm"
            v-model="groupForm.reviewerUserIds"
            mode="multiple"
            :options="teacherOptions"
            :loading="teacherLoading"
            placeholder="选择阅卷教师（多选）"
            allow-search
            :filter-option="false"
            @search="onTeacherSearch"
          />
        </UiFormItem>
      </UiForm>
    </UiDialog>

    <UiDrawer
      :open="editDrawerOpen"
      title="编辑阅卷组织"
      :width="520"
      :confirm-loading="updating"
      @update:open="(v: boolean) => (editDrawerOpen = v)"
      @close="editDrawerOpen = false"
      @ok="submitUpdate"
    >
      <UiForm ref="editFormRef" :model="editForm" :rules="editRules" layout="vertical">
        <UiFormItem label="关联考试">
          <UiInput size="sm" :value="organizationExamLabel" disabled />
        </UiFormItem>
        <UiFormItem label="是否启用匿名阅卷" name="anonymousMode">
          <UiSwitch size="sm" v-model="editForm.anonymousMode" />
          <span class="org-detail__switch-hint">启用后阅卷教师不可见考生身份</span>
        </UiFormItem>
        <UiFormItem label="备注" name="remark">
          <UiTextarea
            size="sm"
            v-model="editForm.remark"
            :rows="3"
            :maxlength="200"
            placeholder="可选，记录组织目的 / 范围"
            :show-count="true"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <UiDrawer
      :open="policyDrawerOpen"
      title="编辑分配策略"
      :width="720"
      @update:open="(v: boolean) => (policyDrawerOpen = v)"
      @close="policyDrawerOpen = false"
    >
      <template v-if="canManageExamOwner">
        <UiForm :model="policyForm" layout="vertical" class="policy-form">
          <UiRow :gutter="16">
            <UiCol :xs="24" :lg="12">
              <h4 class="subsection-title">任务分配策略</h4>
              <UiFormItem label="策略适用范围">
                <UiSelect
                  size="sm"
                  v-model="policyForm.allocationGroupId"
                  placeholder="选择题组（留空表示组织级默认）"
                  :options="groupSelectOptions"
                  allow-clear
                />
              </UiFormItem>
              <UiFormItem label="分配模式" required>
                <UiSelect
                  size="sm"
                  v-model="policyForm.allocationMode"
                  :options="MARKING_ALLOCATION_MODE_OPTIONS"
                />
              </UiFormItem>
              <UiFormItem label="批阅任务单元" required>
                <UiSelect
                  size="sm"
                  v-model="policyForm.allocationUnit"
                  :options="ALLOCATION_UNIT_OPTIONS"
                />
              </UiFormItem>
              <UiFormItem label="匿名模式" required>
                <UiSelect
                  size="sm"
                  v-model="policyForm.anonymityMode"
                  :options="effectiveAnonymityModeOptions"
                  :disabled="true"
                />
                <div class="policy-hint">
                  匿名模式由阅卷组织主配置统一裁决，题组策略只继承当前组织模式。
                </div>
              </UiFormItem>
              <UiFormItem
                v-if="policyForm.allocationUnit === AllocationUnitCode.RANDOM_QUESTIONS"
                label="随机题目抽样数量"
                required
              >
                <UiInputNumber
                  size="sm"
                  v-model="policyForm.randomQuestionSampleSize"
                  :min="1"
                  :max="100"
                  style="width: 100%"
                />
              </UiFormItem>
              <UiFormItem label="每批分配任务数">
                <UiInputNumber
                  size="sm"
                  v-model="policyForm.batchSize"
                  :min="1"
                  :max="500"
                  style="width: 100%"
                />
              </UiFormItem>
              <UiFormItem label="教师最大待处理任务数">
                <UiInputNumber
                  size="sm"
                  v-model="policyForm.loadLimit"
                  :min="1"
                  :max="500"
                  style="width: 100%"
                />
              </UiFormItem>
              <UiFormItem label="匿名令牌策略">
                <UiSelect
                  size="sm"
                  v-model="policyForm.anonymousTokenPolicy"
                  :options="ANONYMOUS_TOKEN_POLICY_OPTIONS"
                  allow-clear
                />
              </UiFormItem>
              <UiButton
                variant="primary"
                size="sm"
                :loading="savingAllocation"
                @click="submitAllocation"
              >
                <template #icon><SaveOutlined /></template>
                保存分配策略
              </UiButton>
            </UiCol>
            <UiCol :xs="24" :lg="12">
              <h4 class="subsection-title">任务回收策略</h4>
              <UiFormItem label="策略适用范围">
                <UiSelect
                  size="sm"
                  v-model="policyForm.recycleGroupId"
                  placeholder="选择题组（留空表示组织级默认）"
                  :options="groupSelectOptions"
                  allow-clear
                />
              </UiFormItem>
              <UiFormItem label="超时时间（分钟）">
                <UiInputNumber
                  size="sm"
                  v-model="policyForm.timeoutMinutes"
                  :min="1"
                  :max="1440"
                  style="width: 100%"
                />
              </UiFormItem>
              <UiFormItem label="教师最大待处理任务数">
                <UiInputNumber
                  size="sm"
                  v-model="policyForm.maxPendingCount"
                  :min="1"
                  :max="500"
                  style="width: 100%"
                />
              </UiFormItem>
              <UiFormItem label="再分配模式">
                <UiSelect
                  size="sm"
                  v-model="policyForm.reassignMode"
                  :options="MARKING_REASSIGN_MODE_OPTIONS"
                  allow-clear
                />
              </UiFormItem>
              <UiButton variant="primary" size="sm" :loading="savingRecycle" @click="submitRecycle">
                <template #icon><SaveOutlined /></template>
                保存回收策略
              </UiButton>
            </UiCol>
          </UiRow>
        </UiForm>
      </template>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { ColumnType } from 'ant-design-vue/es/table'
import type { UserListItemDto } from '@/apis/edu/admin-user'
import type { ExamDetailResponse } from '@/apis/mark/exam'
import type { ExamTemplateResponse } from '@/apis/mark/exam-layout-question'
import type { ExamWorkbenchMarkingProgressPanelResponse } from '@/apis/mark/exam-progress'
import type {
  AllocationPolicyResponse,
  AllocationPolicySaveRequest,
  MarkingOrganizationGroupTaskProgressItemResponse,
  MarkingOrganizationResponse,
  OrganizationUpdateRequest,
  QuestionGroupSaveRequest,
  QuestionMarkingGroupResponse,
  RecyclePolicyResponse,
  RecyclePolicySaveRequest,
} from '@/apis/mark/marking-organization'
import type { ReviewerQualityMetricResponse } from '@/apis/mark/marking-quality'
import type { BadgeTone, UiSectionTabItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import SaveOutlined from '@ant-design/icons-vue/SaveOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminGetUserPage } from '@/apis/edu/admin-user'
import { ANONYMITY_MODE_OPTIONS } from '@/apis/mark/anonymity-mode'
import { getExamDetail } from '@/apis/mark/exam'
import { getExamLayoutQuestionSummary } from '@/apis/mark/exam-layout-question'
import { getMarkingProgressPanel } from '@/apis/mark/exam-progress'
import {
  ALLOCATION_UNIT_OPTIONS,
  ANONYMOUS_TOKEN_POLICY_OPTIONS,
  closeQuestionGroup,
  deleteOrganization,
  deleteQuestionGroup,
  getOrganizationById,
  listMarkingPolicies,
  listOrganizationGroupTaskProgress,
  MARKING_ALLOCATION_MODE_OPTIONS,
  MARKING_ORGANIZATION_STATUS_TONE,
  MARKING_REASSIGN_MODE_OPTIONS,
  MarkingOrganizationStatusDescription,
  QUESTION_GROUP_STATUS_TONE,
  QuestionMarkingGroupStatusDescription,
  requireMarkingOrganizationId,
  saveAllocationPolicy,
  saveQuestionGroup,
  saveRecyclePolicy,
  updateOrganization,
} from '@/apis/mark/marking-organization'
import { listReviewerMetrics } from '@/apis/mark/marking-quality'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiInfoGrid from '@/components/ui-guide/ui/InfoGrid.vue'
import UiInfoGridItem from '@/components/ui-guide/ui/InfoGridItem.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiSearchBox from '@/components/ui-guide/ui/SearchBox.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiDropdownAction from '@/components/ui-guide/ui/UiDropdownAction.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTypographyText from '@/components/ui-guide/ui/UiTypographyText.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useOptionalExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkingOrgPermission } from '@/composables/useMarkingOrgPermission'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { useUserStore } from '@/stores/modules/user'
import { AllocationUnitCode } from '@/types/enums/allocation-unit-enum'
import { AnonymityModeCode } from '@/types/enums/anonymity-mode-enum'
import { AnonymousTokenPolicyCode } from '@/types/enums/anonymous-token-policy-enum'
import { MarkingAllocationModeCode } from '@/types/enums/marking-allocation-mode-enum'
import { MarkingReassignModeCode } from '@/types/enums/marking-reassign-mode-enum'
import { QuestionMarkingGroupStatusCode } from '@/types/enums/question-marking-group-status-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { buildExamLayoutQuestionOptions } from '@/utils/format-exam-layout-question-summary'
import {
  resolveMarkingOrganizationDetailRoute,
  resolveMarkingOrganizationFormalSessionsRoute,
  resolveMarkingOrganizationIndexRoute,
  resolveMarkingOrganizationTrialSessionsRoute,
} from '@/utils/marking-organization-navigation'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import MarkingOrgAssignmentTable from '@/views/admin/marking-organization/components/MarkingOrgAssignmentTable.vue'
import MarkingOrgGroupProgressList from '@/views/admin/marking-organization/components/MarkingOrgGroupProgressList.vue'
import MarkingOrgReviewerRosterTable from '@/views/admin/marking-organization/components/MarkingOrgReviewerRosterTable.vue'
import MarkingOrgStrategySummaryCard from '@/views/admin/marking-organization/components/MarkingOrgStrategySummaryCard.vue'
import RecycledTaskReassignPanel from '@/views/admin/marking-organization/components/RecycledTaskReassignPanel.vue'

defineOptions({ name: 'AdminMarkingOrganizationDetail' })

const MARKING_TEACHER_OPTION_PAGE_SIZE = 20
const TEACHER_SEARCH_DEBOUNCE_MS = 300

const { isJourneyChrome, contextBarTitle, contextBarSubtitle, examStatusLabel, examStatusTone }
  = useOptionalExamJourneyContextBar('阅卷安排')

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { refreshSnapshot } = useWorkspaceExamId()

const organizationId = computed(() => String(route.params.organizationId || ''))
const isExamWorkspaceRoute = computed(() => route.meta.layout === 'ExamWorkspace')
const routeExamId = computed(() => String(route.params.examId || ''))

const organization = ref<MarkingOrganizationResponse | null>(null)
const examDetail = ref<ExamDetailResponse | null>(null)
const examId = computed(() => String(organization.value?.examId || ''))
const workspaceExamId = computed(() => {
  if (isExamWorkspaceRoute.value && routeExamId.value) {
    return routeExamId.value
  }
  return examId.value
})
const activeExamId = computed(() => examId.value || workspaceExamId.value)
const loading = ref(false)
// 加载失败：toast 提示，主区保持空态/列表壳
const activeTab = ref<'info' | 'policy' | 'recycled'>('info')
const policyDrawerOpen = ref(false)
const markingProgressPanel = ref<ExamWorkbenchMarkingProgressPanelResponse | null>(null)
const formalSessionsForGroupProgress = ref<MarkingOrganizationGroupTaskProgressItemResponse[]>([])
const reviewerMetrics = ref<ReviewerQualityMetricResponse[]>([])
const reviewerMetricsLoading = ref(false)

interface GroupProgressSnapshot {
  total: number
  finalized: number
}

const reviewerCount = computed(() => organization.value?.uniqueReviewerCount ?? 0)

const groups = computed<QuestionMarkingGroupResponse[]>(() => organization.value?.groups ?? [])
const groupSearchKeyword = ref('')
const normalizedGroupSearchKeyword = computed(() => groupSearchKeyword.value.trim().toLowerCase())

/** 题组列表前端筛选：匹配名称、组长、阅卷教师、题号与题型 */
function matchesGroupSearch(group: QuestionMarkingGroupResponse, keyword: string): boolean {
  if (group.groupName?.toLowerCase().includes(keyword)) {
    return true
  }
  if (group.leaderUserName?.toLowerCase().includes(keyword)) {
    return true
  }
  if (group.leaderTeacherNo?.toLowerCase().includes(keyword)) {
    return true
  }
  if (
    strictEnumLabel(QuestionMarkingGroupStatusDescription, group.groupStatus, '题组状态')
      .toLowerCase()
      .includes(keyword)
  ) {
    return true
  }
  if (
    group.reviewers.some(
      (reviewer) =>
        reviewer.reviewerUserName?.toLowerCase().includes(keyword)
        || reviewer.reviewerTeacherNo?.toLowerCase().includes(keyword),
    )
  ) {
    return true
  }
  return group.questions.some(
    (question) =>
      String(question.questionNo).includes(keyword)
      || question.questionTypeMessage?.toLowerCase().includes(keyword),
  )
}

const filteredGroups = computed(() => {
  const keyword = normalizedGroupSearchKeyword.value
  if (!keyword) {
    return groups.value
  }
  return groups.value.filter((group) => matchesGroupSearch(group, keyword))
})

const groupTableSortedInfo = computed(() => {
  if (!normalizedGroupSearchKeyword.value || groups.value.length === 0) {
    return ''
  }
  return `已筛选 ${filteredGroups.value.length} / ${groups.value.length} 个题组`
})

const groupTableEmptyDescription = computed(() => {
  if (groups.value.length === 0) {
    return '暂无题组，创建后可配置题目范围与阅卷教师'
  }
  if (normalizedGroupSearchKeyword.value) {
    return '未找到匹配题组，请调整搜索关键词'
  }
  return '暂无题组，创建后可配置题目范围与阅卷教师'
})
const organizationExamLabel = computed(() => {
  if (!organization.value) return '请重新进入阅卷组织详情'
  return organization.value.examNo
    ? `${organization.value.examName}（${organization.value.examNo}）`
    : organization.value.examName
})

const orgSignalMetrics = computed((): SignalMetric[] => {
  const org = organization.value
  if (!org) {
    return []
  }
  const summary = markingProgressPanel.value?.markingTaskSummary
  const overallPercent
    = summary && summary.totalTaskCount > 0
      ? Math.round((summary.finalizedTaskCount * 100) / summary.totalTaskCount)
      : null
  const metrics: SignalMetric[] = [
    {
      key: 'leader',
      label: '阅卷组长',
      value: org.leaderUserName || '—',
      tone: 'blue',
    },
    {
      key: 'groups',
      label: '题组',
      value: org.groupCount ?? org.groups.length,
      unit: '组',
      tone: 'green',
    },
    {
      key: 'reviewers',
      label: '教师数',
      value: reviewerCount.value,
      unit: '人',
      tone: 'blue',
    },
    {
      key: 'anonymous',
      label: '匿名模式',
      value: org.anonymousMode ? '启用' : '关闭',
      tone: org.anonymousMode ? 'green' : 'gray',
    },
  ]
  if (overallPercent != null) {
    metrics.push({
      key: 'progress',
      label: '整体进度',
      value: overallPercent,
      unit: '%',
      tone: overallPercent >= 60 ? 'green' : 'orange',
    })
  } else {
    metrics.push({
      key: 'status',
      label: '组织状态',
      value: strictEnumLabel(
        MarkingOrganizationStatusDescription,
        org.organizationStatus,
        '阅卷组织状态',
      ),
      tone: strictEnumTone(
        MARKING_ORGANIZATION_STATUS_TONE,
        org.organizationStatus,
        '阅卷组织状态',
      ),
    })
  }
  return metrics
})

const orgDefaultAllocationPolicy = computed(() =>
  allocationPolicies.value.find((policy) => policy.groupId == null),
)

const orgDefaultRecyclePolicy = computed(() =>
  recyclePolicies.value.find((policy) => policy.groupId == null),
)

const groupProgressById = computed((): Record<string, GroupProgressSnapshot> => {
  const map: Record<string, GroupProgressSnapshot> = {}
  for (const item of formalSessionsForGroupProgress.value) {
    map[item.groupId] = {
      total: item.totalTaskCount ?? 0,
      finalized: item.finalizedTaskCount ?? 0,
    }
  }
  return map
})

const examCreateUserId = computed(
  () => examDetail.value?.createUser ?? organization.value?.examCreateUserId,
)
const { canManageExamOwner } = useMarkingOrgPermission(examCreateUserId, organization)

function guardExamOwnerAction(): boolean {
  if (canManageExamOwner.value) return true
  showFormValidationMessage('仅考试主考老师可执行该操作')
  return false
}

/** 工作台双栏布局：加载题组进度与教师质量指标真源。 */
async function loadWorkbenchPanels(): Promise<void> {
  if (!isExamWorkspaceRoute.value || !activeExamId.value || !organizationId.value) {
    markingProgressPanel.value = null
    formalSessionsForGroupProgress.value = []
    reviewerMetrics.value = []
    return
  }
  reviewerMetricsLoading.value = true
  try {
    try {
      markingProgressPanel.value = await getMarkingProgressPanel(activeExamId.value)
    } catch (error) {
      markingProgressPanel.value = null
      showUserError(error, '阅卷进度面板加载失败')
    }
    try {
      const metricsResult = await listReviewerMetrics({
        examId: activeExamId.value,
        organizationId: organizationId.value,
        pageNum: 1,
        pageSize: 200,
      })
      reviewerMetrics.value = metricsResult.list ?? []
    } catch (error) {
      reviewerMetrics.value = []
      showUserError(error, '阅卷人质量指标加载失败')
    }
    try {
      formalSessionsForGroupProgress.value = await listOrganizationGroupTaskProgress({
        organizationId: organizationId.value,
      })
    } catch (error) {
      formalSessionsForGroupProgress.value = []
      showUserError(error, '题组任务进度加载失败')
    }
  } finally {
    reviewerMetricsLoading.value = false
  }
}

/**
 * MVR-392：回收再分配写闸与 BE requireRecycledTaskReassignPermission + requireActiveExam 同源。
 * - 主考：canManageExamOwner（主考 ∧ ACTIVE）
 * - 组织负责人 / 题组组长：须考试 ACTIVE（examDetail.status），禁止关考后假可点
 * 禁止仅用 leaderUserId 本地回退且不叠 ACTIVE。
 */
const canReassignRecycledTasks = computed(() => {
  if (!organization.value) {
    return false
  }
  const userId = userStore.userInfo.userId
  if (!userId) {
    return false
  }
  // 主考路径已叠 ACTIVE
  if (canManageExamOwner.value === true) {
    return true
  }
  // 非主考再分配写须 ACTIVE；examDetail 未就绪默认拒绝
  if (examDetail.value?.status !== ExamStatusCode.ACTIVE) {
    return false
  }
  if (organization.value.leaderUserId != null && String(organization.value.leaderUserId) === String(userId)) {
    return true
  }
  return groups.value.some((group) => String(group.leaderUserId) === String(userId))
})
/** 整场回收任务列表：主考（ACTIVE）或组织负责人（BE canListAll；关考主考仍可由 BE 列表门禁承接，FE 与 canManageExamOwner 对齐不扩权） */
const canViewAllRecycledTasks = computed(() => {
  if (canManageExamOwner.value === true) {
    return true
  }
  const userId = userStore.userInfo.userId
  if (!userId || !organization.value?.leaderUserId) {
    return false
  }
  return String(organization.value.leaderUserId) === String(userId)
})

const detailTabItems = computed((): UiSectionTabItem[] => {
  const items: UiSectionTabItem[] = [
    {
      key: 'info',
      label: '基本信息 + 题组',
      count: organization.value?.groups.length,
    },
    { key: 'policy', label: '任务策略' },
  ]
  if (canReassignRecycledTasks.value) {
    items.push({ key: 'recycled', label: '回收待分配' })
  }
  return items
})

const leaderGroupIds = computed(() => {
  const userId = userStore.userInfo.userId
  return groups.value.filter((group) => group.leaderUserId === userId).map((group) => group.id)
})

const editDrawerOpen = ref(false)
const updating = ref(false)
const deleting = ref(false)
const editFormRef = ref<FormInstance>()

interface EditForm {
  anonymousMode: boolean
  remark?: string
}

const editForm = reactive<EditForm>({
  anonymousMode: true,
  remark: '',
})

const editRules: Record<string, Rule[]> = {
  remark: [{ max: 200, message: '备注最多 200 字', trigger: 'blur' }],
}

function resetPolicyState(): void {
  allocationPolicies.value = []
  recyclePolicies.value = []
  applyAllocationPolicyToForm()
  applyRecyclePolicyToForm()
}

/**
 * 工作台详情路由必须与组织真实 examId 对齐，否则阶段快照、回跳目标与当前操作对象会错位。
 */
async function alignWorkspaceRouteExamId(
  nextOrganization: MarkingOrganizationResponse,
): Promise<boolean> {
  if (!nextOrganization.examId) {
    return true
  }
  if (isExamWorkspaceRoute.value && routeExamId.value === nextOrganization.examId) {
    return true
  }
  await router.replace(
    resolveMarkingOrganizationDetailRoute(
      requireMarkingOrganizationId(nextOrganization),
      nextOrganization.examId,
    ),
  )
  return false
}

async function loadOrganization(): Promise<void> {
  if (!organizationId.value) {
    organization.value = null
    examDetail.value = null
    groupSearchKeyword.value = ''
    resetPolicyState()
    return
  }
  loading.value = true
  try {
    const nextOrganization = await getOrganizationById({ organizationId: organizationId.value })
    if (!(await alignWorkspaceRouteExamId(nextOrganization))) {
      return
    }
    organization.value = nextOrganization
    examDetail.value = await getExamDetail(nextOrganization.examId)
    await loadMarkingPolicies()
    await loadWorkbenchPanels()
  } catch (error) {
    organization.value = null
    examDetail.value = null
    resetPolicyState()
    showUserError(error, '阅卷组织详情加载失败')
  } finally {
    loading.value = false
  }
}

const groupColumns: ColumnType<QuestionMarkingGroupResponse>[] = [
  { title: '题组名称', key: 'groupName', dataIndex: 'groupName', width: 220 },
  { title: '负责题目', key: 'questions', width: 280 },
  { title: '阅卷教师', key: 'reviewers', width: 240 },
  { title: '题组组长', key: 'leaderUser', width: 160 },
  { title: '状态', key: 'groupStatus', width: 100 },
  { title: '创建时间', key: 'createTime', width: 170 },
  { title: '操作', key: 'action', width: 220 },
]

const teacherList = ref<UserListItemDto[]>([])
const teacherOptions = ref<Array<{ value: string, label: string }>>([])
const teacherLoading = ref(false)
let teacherSearchTimer: ReturnType<typeof setTimeout> | undefined

function buildTeacherOption(item: UserListItemDto): { value: string, label: string } {
  return {
    value: item.id,
    label: item.identifierNumber ? `${item.nickName} (${item.identifierNumber})` : item.nickName,
  }
}

function cacheTeachers(items: UserListItemDto[]): void {
  for (const item of items) {
    if (!teacherList.value.some((teacher) => teacher.id === item.id)) {
      teacherList.value.push(item)
    }
  }
}

async function pinTeacherById(teacherId: string): Promise<void> {
  const cached = teacherList.value.find((item) => item.id === teacherId)
  if (cached) {
    const option = buildTeacherOption(cached)
    if (!teacherOptions.value.some((item) => item.value === option.value)) {
      teacherOptions.value = [option, ...teacherOptions.value]
    }
    return
  }
  const result = await adminGetUserPage({
    id: teacherId,
    pageNum: 1,
    pageSize: 1,
    roleKey: 'SCH_TECH',
  })
  if (result.list.length === 0) return
  cacheTeachers(result.list)
  const option = buildTeacherOption(result.list[0])
  if (!teacherOptions.value.some((item) => item.value === option.value)) {
    teacherOptions.value = [option, ...teacherOptions.value]
  }
}

async function loadTeachers(keyword?: string): Promise<void> {
  teacherLoading.value = true
  try {
    const result = await adminGetUserPage({
      pageNum: 1,
      pageSize: MARKING_TEACHER_OPTION_PAGE_SIZE,
      roleKey: 'SCH_TECH',
      keyword: keyword?.trim() || undefined,
    })
    cacheTeachers(result.list)
    teacherOptions.value = result.list.map((item) => buildTeacherOption(item))
    const pinnedIds = [groupForm.leaderUserId, ...groupForm.reviewerUserIds].filter(
      (teacherId): teacherId is string => Boolean(teacherId),
    )
    for (const teacherId of pinnedIds) {
      if (!teacherOptions.value.some((item) => item.value === teacherId)) {
        await pinTeacherById(teacherId)
      }
    }
  } catch (error) {
    teacherOptions.value = []
    showUserError(error, '阅卷教师列表加载失败')
  } finally {
    teacherLoading.value = false
  }
}

function onTeacherSearch(keyword: string): void {
  if (teacherSearchTimer) {
    clearTimeout(teacherSearchTimer)
  }
  teacherSearchTimer = setTimeout(() => {
    void loadTeachers(keyword)
  }, TEACHER_SEARCH_DEBOUNCE_MS)
}

interface QuestionOption {
  value: string
  label: string
  disabled?: boolean
  title?: string
}

const questionOptions = ref<QuestionOption[]>([])
const layoutSummary = ref<ExamTemplateResponse | null>(null)
const layoutRoiGap = computed(() => {
  if (!layoutSummary.value?.configured) {
    return 0
  }
  const total = layoutSummary.value.totalQuestionCount ?? 0
  const ready = layoutSummary.value.roiReadyQuestionCount ?? 0
  return Math.max(0, total - ready)
})
const loadedLayoutQuestionExamId = ref<string | null>(null)
const templateLoading = ref(false)

async function loadLayoutQuestions(): Promise<void> {
  const currentExamId = examId.value
  if (!currentExamId) return
  if (loadedLayoutQuestionExamId.value === currentExamId && questionOptions.value.length > 0) return
  templateLoading.value = true
  try {
    const tpl = await getExamLayoutQuestionSummary(currentExamId)
    layoutSummary.value = tpl
    if (!tpl.configured) {
      questionOptions.value = []
      loadedLayoutQuestionExamId.value = currentExamId
      return
    }
    questionOptions.value = buildExamLayoutQuestionOptions(tpl.questions)
    loadedLayoutQuestionExamId.value = currentExamId
  } catch (error) {
    showUserError(error, '考试制卷题目加载失败')
  } finally {
    templateLoading.value = false
  }
}

const groupModalOpen = ref(false)
const savingGroup = ref(false)
const groupFormRef = ref<FormInstance>()

interface GroupForm {
  groupId?: string
  groupName: string
  leaderUserId?: string
  layoutQuestionIds: string[]
  reviewerUserIds: string[]
  wholePaperGroup: boolean
}

const groupForm = reactive<GroupForm>({
  groupId: undefined,
  groupName: '',
  leaderUserId: undefined,
  layoutQuestionIds: [],
  reviewerUserIds: [],
  wholePaperGroup: false,
})
const groupModalTitle = computed(() => (groupForm.groupId ? '编辑题组' : '新建题组'))
const groupActionLoadingId = ref<string>()

const groupRules: Record<string, Rule[]> = {
  groupName: [
    { required: true, message: '请输入题组名称', trigger: 'blur' },
    { max: 50, message: '题组名称最多 50 字', trigger: 'blur' },
  ],
  leaderUserId: [{ required: true, message: '请选择题组组长', trigger: 'change' }],
  layoutQuestionIds: [
    {
      validator: (_rule, value: string[]) => {
        if (groupForm.wholePaperGroup) {
          return Promise.resolve()
        }
        if (!value || value.length === 0) {
          return Promise.reject(new Error('请至少选择 1 道题目'))
        }
        return Promise.resolve()
      },
      trigger: 'change',
    },
  ],
  reviewerUserIds: [
    {
      required: true,
      type: 'array',
      min: 1,
      message: '请至少选择 1 名阅卷教师',
      trigger: 'change',
    },
    {
      validator: (_rule, value: string[]) => {
        const chiefId = examCreateUserId.value
        if (!chiefId) {
          return Promise.resolve()
        }
        if (value.includes(chiefId)) {
          return Promise.resolve()
        }
        const chiefInOtherGroup = organization.value?.groups.some((group) => {
          if (groupForm.groupId && group.id === groupForm.groupId) {
            return false
          }
          return group.reviewers.some((reviewer) => reviewer.reviewerUserId === chiefId)
        })
        if (chiefInOtherGroup) {
          return Promise.resolve()
        }
        return Promise.reject(new Error('考试主考老师必须加入至少一个题组的阅卷教师'))
      },
      trigger: 'change',
    },
  ],
}

function openGroupModal(): void {
  if (!guardExamOwnerAction()) return
  groupForm.groupId = undefined
  groupForm.groupName = ''
  groupForm.leaderUserId = undefined
  groupForm.layoutQuestionIds = []
  groupForm.reviewerUserIds = examCreateUserId.value ? [examCreateUserId.value] : []
  groupForm.wholePaperGroup = false
  groupModalOpen.value = true
  void loadTeachers()
  void loadLayoutQuestions()
}

function openGroupEdit(record: QuestionMarkingGroupResponse): void {
  if (!guardExamOwnerAction()) return
  // MVR-385：与 canEditGroup / 非 CLOSED 状态二次拦截
  if (!canEditGroup(record)) {
    showFormValidationMessage('当前题组状态不可编辑')
    return
  }
  groupForm.groupId = record.id
  groupForm.groupName = record.groupName
  groupForm.leaderUserId = record.leaderUserId
  groupForm.layoutQuestionIds = record.questions.map((question) => question.layoutQuestionId)
  groupForm.reviewerUserIds = record.reviewers.map((reviewer) => reviewer.reviewerUserId)
  groupForm.wholePaperGroup = record.questions.length === 0 && record.groupName.includes('整卷')
  groupModalOpen.value = true
  void loadTeachers()
  void loadLayoutQuestions()
}

function openGroupEditById(groupId: string): void {
  const record = groups.value.find((group) => group.id === groupId)
  if (!record) {
    showUserError(new Error(`题组不存在 groupId=${groupId}`), '题组不存在或已删除')
    return
  }
  openGroupEdit(record)
}

function openPolicyDrawer(): void {
  if (!guardExamOwnerAction()) return
  policyForm.allocationGroupId = undefined
  policyForm.recycleGroupId = undefined
  applyAllocationPolicyToForm()
  applyRecyclePolicyToForm()
  policyDrawerOpen.value = true
}

async function submitGroup(): Promise<void> {
  if (savingGroup.value) {
    return
  }
  if (!guardExamOwnerAction()) return
  // MVR-396：更新已有题组须叠 canEditGroup（非 CLOSED）；创建仅主考闸
  if (groupForm.groupId) {
    const existing = groups.value.find((group) => group.id === groupForm.groupId)
    if (!existing || !canEditGroup(existing)) {
      showFormValidationMessage('当前题组状态不可编辑')
      return
    }
  }
  if (!organizationId.value || !groupFormRef.value) return
  try {
    await groupFormRef.value.validate()
  } catch {
    return
  }
  savingGroup.value = true
  try {
    const request: QuestionGroupSaveRequest = {
      organizationId: organizationId.value,
      groupId: groupForm.groupId,
      groupName: groupForm.groupName,
      leaderUserId: groupForm.leaderUserId!,
      layoutQuestionIds: groupForm.wholePaperGroup ? [] : groupForm.layoutQuestionIds,
      wholePaperGroup: groupForm.wholePaperGroup || undefined,
      reviewerUserIds: groupForm.reviewerUserIds,
    }
    await saveQuestionGroup(request)
    message.success(groupForm.groupId ? '题组已更新' : '题组已创建')
    groupModalOpen.value = false
    await loadOrganization()
    await refreshSnapshot()
  } catch (error) {
    const fallback = groupForm.groupId ? '更新题组失败' : '创建题组失败'
    showUserError(error, fallback)
  } finally {
    savingGroup.value = false
  }
}

function canEditGroup(record: QuestionMarkingGroupResponse): boolean {
  return (
    canManageExamOwner.value && record.groupStatus !== QuestionMarkingGroupStatusCode.GROUP_CLOSED
  )
}

function canDeleteGroup(record: QuestionMarkingGroupResponse): boolean {
  return (
    canManageExamOwner.value && record.groupStatus === QuestionMarkingGroupStatusCode.GROUP_DRAFT
  )
}

function canCloseGroup(record: QuestionMarkingGroupResponse): boolean {
  return (
    canManageExamOwner.value
    && (record.groupStatus === QuestionMarkingGroupStatusCode.GROUP_ACTIVE
      || record.groupStatus === QuestionMarkingGroupStatusCode.GROUP_CONFIGURED)
  )
}

async function handleGroupRowAction(key: string, record: QuestionMarkingGroupResponse) {
  if (key === 'edit') {
    openGroupEdit(record)
    return
  }
  if (key === 'delete') {
    // MVR-385：与 canDeleteGroup / 仅 DRAFT 二次拦截
    if (!canDeleteGroup(record)) {
      showFormValidationMessage('仅草稿题组可删除')
      return
    }
    if (!(await confirmAsync({ content: '确认删除该题组？', okText: '删除', type: 'warning' })))
      return
    await submitGroupDelete(record)
    return
  }
  if (key === 'close') {
    // MVR-385：与 canCloseGroup / ACTIVE|CONFIGURED 二次拦截
    if (!canCloseGroup(record)) {
      showFormValidationMessage('当前题组状态不可关闭')
      return
    }
    if (!(await confirmAsync({ content: '确认关闭该题组？', okText: '关闭', type: 'warning' })))
      return
    await submitGroupClose(record)
  }
}

async function submitGroupDelete(record: QuestionMarkingGroupResponse): Promise<void> {
  if (groupActionLoadingId.value) {
    return
  }
  if (!guardExamOwnerAction()) return
  // MVR-385：handler 二次认 canDeleteGroup
  if (!canDeleteGroup(record)) {
    showFormValidationMessage('仅草稿题组可删除')
    return
  }
  groupActionLoadingId.value = record.id
  try {
    await deleteQuestionGroup({ groupId: record.id })
    message.success('题组已删除')
    await loadOrganization()
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '题组删除失败')
  } finally {
    groupActionLoadingId.value = undefined
  }
}

async function submitGroupClose(record: QuestionMarkingGroupResponse): Promise<void> {
  if (groupActionLoadingId.value) {
    return
  }
  if (!guardExamOwnerAction()) return
  // MVR-385：handler 二次认 canCloseGroup
  if (!canCloseGroup(record)) {
    showFormValidationMessage('当前题组状态不可关闭')
    return
  }
  groupActionLoadingId.value = record.id
  try {
    await closeQuestionGroup({ groupId: record.id })
    message.success('题组已关闭')
    await loadOrganization()
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '题组关闭失败')
  } finally {
    groupActionLoadingId.value = undefined
  }
}

function openEditDrawer(): void {
  if (!guardExamOwnerAction()) return
  if (!organization.value) return
  editForm.anonymousMode = Boolean(organization.value.anonymousMode)
  editForm.remark = organization.value.remark || ''
  editDrawerOpen.value = true
  void loadTeachers()
}

async function submitUpdate(): Promise<void> {
  if (updating.value) {
    return
  }
  if (!guardExamOwnerAction()) return
  if (!organization.value || !editFormRef.value) return
  try {
    await editFormRef.value.validate()
  } catch {
    return
  }
  updating.value = true
  try {
    const request: OrganizationUpdateRequest = {
      organizationId: requireMarkingOrganizationId(organization.value),
      anonymousMode: editForm.anonymousMode,
      remark: editForm.remark?.trim() || undefined,
    }
    organization.value = await updateOrganization(request)
    message.success('阅卷组织已更新')
    editDrawerOpen.value = false
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '阅卷组织更新失败')
  } finally {
    updating.value = false
  }
}

const orgDetailMoreActionItems = computed(() => [
  { key: 'delete', label: '删除组织', danger: true, disabled: deleting.value },
])

function onOrgDetailMoreAction(key: string) {
  if (key === 'delete') {
    void requestDeleteOrganization()
  }
}

async function requestDeleteOrganization(): Promise<void> {
  // MVR-396：删除组织打开确认前叠主考闸，禁止仅靠更多菜单显隐
  if (!guardExamOwnerAction()) return
  const ok = await confirmAsync({
    title: '确认删除该阅卷组织？',
    content: '删除后不可恢复；请确认组织下无进行中的试评/正评会话。',
    type: 'error',
    okText: '删除',
  })
  if (!ok) {
    return
  }
  await submitDelete()
}

async function submitDelete(): Promise<void> {
  if (deleting.value) {
    return
  }
  if (!guardExamOwnerAction()) return
  if (!organization.value) return
  deleting.value = true
  try {
    await deleteOrganization({ organizationId: requireMarkingOrganizationId(organization.value) })
    await refreshSnapshot()
    message.success('阅卷组织已删除')
    await router.push(resolveMarkingOrganizationIndexRoute(activeExamId.value || undefined))
  } catch (error) {
    showUserError(error, '阅卷组织删除失败')
  } finally {
    deleting.value = false
  }
}

interface PolicyForm {
  allocationGroupId?: string
  allocationMode: MarkingAllocationModeCode
  allocationUnit: AllocationUnitCode
  anonymityMode: AnonymityModeCode
  randomQuestionSampleSize?: number
  batchSize: number
  loadLimit: number
  anonymousTokenPolicy: AnonymousTokenPolicyCode
  recycleGroupId?: string
  timeoutMinutes?: number
  maxPendingCount?: number
  reassignMode?: MarkingReassignModeCode
}

const policyForm = reactive<PolicyForm>({
  allocationGroupId: undefined,
  allocationMode: MarkingAllocationModeCode.BY_QUESTION,
  allocationUnit: AllocationUnitCode.SELECTED_QUESTIONS,
  anonymityMode: AnonymityModeCode.ANONYMOUS,
  randomQuestionSampleSize: undefined,
  batchSize: 20,
  loadLimit: 50,
  anonymousTokenPolicy: AnonymousTokenPolicyCode.PER_EXAM,
  recycleGroupId: undefined,
  timeoutMinutes: 60,
  maxPendingCount: 30,
  reassignMode: MarkingReassignModeCode.AUTO,
})

const allocationPolicies = ref<AllocationPolicyResponse[]>([])
const recyclePolicies = ref<RecyclePolicyResponse[]>([])

const effectiveAnonymityMode = computed(() =>
  organization.value?.anonymousMode ? AnonymityModeCode.ANONYMOUS : AnonymityModeCode.NAMED,
)

const effectiveAnonymityModeOptions = computed(() =>
  ANONYMITY_MODE_OPTIONS.filter((option) => option.value === effectiveAnonymityMode.value),
)

const DEFAULT_ALLOCATION_POLICY_FIELDS = {
  allocationMode: MarkingAllocationModeCode.BY_QUESTION,
  allocationUnit: AllocationUnitCode.SELECTED_QUESTIONS,
  anonymityMode: AnonymityModeCode.ANONYMOUS,
  randomQuestionSampleSize: undefined,
  batchSize: 20,
  loadLimit: 50,
  anonymousTokenPolicy: AnonymousTokenPolicyCode.PER_EXAM,
}

const DEFAULT_RECYCLE_POLICY_FIELDS = {
  timeoutMinutes: 60,
  maxPendingCount: 30,
  reassignMode: MarkingReassignModeCode.AUTO,
}

function findPolicyByGroup<T extends { groupId?: string | null }>(
  policies: T[],
  groupId?: string,
): T | undefined {
  if (groupId) {
    return policies.find((item) => item.groupId === groupId)
  }
  return policies.find((item) => item.groupId == null)
}

function applyAllocationPolicyToForm(): void {
  const saved = findPolicyByGroup(allocationPolicies.value, policyForm.allocationGroupId)
  if (saved) {
    policyForm.allocationMode = saved.allocationMode
    policyForm.allocationUnit = saved.allocationUnit
    policyForm.anonymityMode = effectiveAnonymityMode.value
    policyForm.randomQuestionSampleSize = saved.randomQuestionSampleSize
    policyForm.batchSize = saved.batchSize
    policyForm.loadLimit = saved.loadLimit
    policyForm.anonymousTokenPolicy = saved.anonymousTokenPolicy
    return
  }
  Object.assign(policyForm, DEFAULT_ALLOCATION_POLICY_FIELDS)
  policyForm.anonymityMode = effectiveAnonymityMode.value
}

function applyRecyclePolicyToForm(): void {
  const saved = findPolicyByGroup(recyclePolicies.value, policyForm.recycleGroupId)
  if (saved) {
    policyForm.timeoutMinutes = saved.timeoutMinutes
    policyForm.maxPendingCount = saved.maxPendingCount
    policyForm.reassignMode = saved.reassignMode
    return
  }
  Object.assign(policyForm, DEFAULT_RECYCLE_POLICY_FIELDS)
}

async function loadMarkingPolicies(): Promise<void> {
  if (!organizationId.value) {
    allocationPolicies.value = []
    recyclePolicies.value = []
    applyAllocationPolicyToForm()
    applyRecyclePolicyToForm()
    return
  }
  try {
    const response = await listMarkingPolicies({ organizationId: organizationId.value })
    allocationPolicies.value = response.allocationPolicies ?? []
    recyclePolicies.value = response.recyclePolicies ?? []
    applyAllocationPolicyToForm()
    applyRecyclePolicyToForm()
  } catch (error) {
    showUserError(error, '阅卷任务策略加载失败')
    resetPolicyState()
  }
}

watch(() => policyForm.allocationGroupId, applyAllocationPolicyToForm)
watch(() => policyForm.recycleGroupId, applyRecyclePolicyToForm)
watch(effectiveAnonymityMode, (mode) => {
  policyForm.anonymityMode = mode
})

const groupSelectOptions = computed(() => [
  ...groups.value.map((g) => ({ value: g.id, label: g.groupName })),
])

const groupAllocationUnitMap = computed(() => {
  const map: Record<string, AllocationUnitCode> = {}
  const defaultAllocationUnit = allocationPolicies.value.find(
    (policy) => policy.groupId == null,
  )?.allocationUnit
  for (const group of groups.value) {
    const groupPolicy = allocationPolicies.value.find((policy) => policy.groupId === group.id)
    const allocationUnit = groupPolicy?.allocationUnit ?? defaultAllocationUnit
    if (allocationUnit) {
      map[group.id] = allocationUnit
    }
  }
  return map
})

function policyOptionLabel(
  options: Array<{ value: string, label: string }>,
  value?: string | null,
): string {
  if (!value) {
    return '—'
  }
  return options.find((item) => item.value === value)?.label ?? value
}

function policyScopeLabel(groupId?: string): string {
  if (!groupId) {
    return '组织级默认'
  }
  return groupSelectOptions.value.find((item) => item.value === groupId)?.label ?? groupId
}

const savingAllocation = ref(false)
async function submitAllocation(): Promise<void> {
  if (savingAllocation.value) {
    return
  }
  if (!guardExamOwnerAction()) return
  if (!organizationId.value) return
  savingAllocation.value = true
  try {
    const request: AllocationPolicySaveRequest = {
      organizationId: organizationId.value,
      groupId: policyForm.allocationGroupId,
      allocationMode: policyForm.allocationMode,
      allocationUnit: policyForm.allocationUnit,
      anonymityMode: effectiveAnonymityMode.value,
      randomQuestionSampleSize: policyForm.randomQuestionSampleSize,
      batchSize: policyForm.batchSize,
      loadLimit: policyForm.loadLimit,
      anonymousTokenPolicy: policyForm.anonymousTokenPolicy,
    }
    await saveAllocationPolicy(request)
    message.success('分配策略已保存')
    policyDrawerOpen.value = false
    await loadMarkingPolicies()
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '阅卷任务分配策略保存失败')
  } finally {
    savingAllocation.value = false
  }
}

const savingRecycle = ref(false)
async function submitRecycle(): Promise<void> {
  if (savingRecycle.value) {
    return
  }
  if (!guardExamOwnerAction()) return
  if (!organizationId.value) return
  savingRecycle.value = true
  try {
    const request: RecyclePolicySaveRequest = {
      organizationId: organizationId.value,
      groupId: policyForm.recycleGroupId,
      timeoutMinutes: policyForm.timeoutMinutes,
      maxPendingCount: policyForm.maxPendingCount,
      reassignMode: policyForm.reassignMode,
    }
    await saveRecyclePolicy(request)
    message.success('回收策略已保存')
    policyDrawerOpen.value = false
    await loadMarkingPolicies()
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '阅卷任务回收策略保存失败')
  } finally {
    savingRecycle.value = false
  }
}

function goTrialSessions(): void {
  const examId = activeExamId.value
  if (!examId || !organizationId.value) {
    showUserError(new Error('缺少考试上下文'), '无法进入试评定标')
    return
  }
  void router.push(resolveMarkingOrganizationTrialSessionsRoute(organizationId.value, examId))
}

function goFormalSessions(): void {
  const examId = activeExamId.value
  if (!examId || !organizationId.value) {
    showUserError(new Error('缺少考试上下文'), '无法进入正评会话')
    return
  }
  void router.push(resolveMarkingOrganizationFormalSessionsRoute(organizationId.value, examId))
}

// 严格 typed helper：题组 groupStatus 是后端合同必返枚举。
function groupStatusTone(status: QuestionMarkingGroupStatusCode): BadgeTone {
  return strictEnumTone(QUESTION_GROUP_STATUS_TONE, status, '题组状态')
}

function groupStatusLabel(status: QuestionMarkingGroupStatusCode): string {
  return strictEnumLabel(QuestionMarkingGroupStatusDescription, status, '题组状态')
}

watch(
  () => ({ organizationId: organizationId.value, routeExamId: routeExamId.value }),
  () => {
    void loadOrganization()
  },
  { immediate: true },
)

watch(
  () => route.query.tab,
  (tab) => {
    if (typeof tab !== 'string') {
      return
    }
    activeTab.value = tab === 'policy' || tab === 'recycled' ? tab : 'info'
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.org-detail {
  &__readonly-banner {
    margin-bottom: 12px;
  }

  &__secondary {
    margin-top: var(--dp-space-3);
  }

  &__panel {
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    padding: var(--dp-space-3, 12px);
  }

  &__empty {
    padding: var(--dp-space-3, 12px) 0;
  }

  &__switch-hint {
    margin-left: 8px;
    font-size: 12px;
    color: var(--dp-text-muted);
  }
}

.detail-tabs {
  :deep(.ant-tabs-nav) {
    margin-bottom: var(--dp-space-3, 12px);
  }
}

.org-detail__info {
  margin-bottom: 16px;
}

.org-detail__info-title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--dp-text-primary);
}

.org-detail__remark {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  padding: 12px 16px;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
}

.org-detail__remark-label {
  flex-shrink: 0;
  min-width: 70px;
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text-secondary);
}

.org-detail__remark-value {
  font-size: 14px;
  line-height: 1.6;
  color: var(--dp-text-primary);
  word-break: break-word;
}

.org-detail__group-table {
  margin-top: 16px;
}

.org-detail__group-search {
  width: min(320px, 100%);
}

.group-table {
  &__stack {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__item {
    font-size: 13px;
    line-height: 1.5;
    color: var(--dp-text-secondary);
  }

  &__more {
    font-size: 12px;
    color: var(--dp-text-muted);
  }
}

.policy-form {
  .subsection-title {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 500;
    color: var(--dp-text-primary);
  }

  .policy-hint {
    margin-top: 6px;
    color: var(--dp-text-muted);
    font-size: 12px;
    line-height: 1.5;
  }
}

.status-form {
  max-width: 480px;
}

.org-workbench__assignment {
  margin-bottom: 0;
}

.org-workbench__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--dp-space-3);
  margin-top: var(--dp-space-3);

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
}

:deep(.org-roster) {
  margin-top: var(--dp-space-3);
}
</style>
