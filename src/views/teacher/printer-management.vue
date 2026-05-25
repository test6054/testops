<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="printer-management__context">
        <div class="printer-management__context-info">
          <h2 class="printer-management__title">阅卷交付 - 打印机 / 扫描仪管理</h2>
          <a-tag color="blue"> 共 {{ devices.length }} 台设备 </a-tag>
        </div>
        <div class="printer-management__context-actions">
          <a-button @click="loadDevices"> 刷新 </a-button>
          <a-button type="primary" @click="handleCreate">
            <template #icon>
              <PlusOutlined />
            </template>
            新增设备
          </a-button>
        </div>
      </div>
    </template>

    <div class="printer-management">
      <!-- 筛选栏 -->
      <div class="filter-row">
        <a-input
          v-model:value="searchForm.scannerDeviceIdKeyword"
          placeholder="按设备业务ID搜索"
          allow-clear
          style="width: 240px; margin-right: 12px"
          @press-enter="handleSearch"
        />
        <a-select
          v-model:value="searchForm.interfaceMode"
          placeholder="接入模式"
          allow-clear
          style="width: 160px; margin-right: 12px"
          :options="interfaceModeOptions"
        />
        <a-select
          v-model:value="searchForm.status"
          placeholder="设备状态"
          allow-clear
          style="width: 160px; margin-right: 12px"
          :options="statusOptions"
        />
        <a-button type="primary" @click="handleSearch">查询</a-button>
        <a-button style="margin-left: 8px" @click="handleResetSearch">重置</a-button>
      </div>

      <!-- D-9 错误态：设备列表加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="devicesLoadError"
        :error="devicesLoadError"
        title="扫描设备列表加载失败"
        compact
        @retry="loadDevices"
      />
      <UiErrorRetryPanel
        v-if="agentUnbindError"
        :error="agentUnbindError"
        title="扫描 Agent 解绑失败"
        compact
        :show-retry="false"
        style="margin-bottom: 16px"
      />
      <UiErrorRetryPanel
        v-if="deviceDeleteError"
        :error="deviceDeleteError"
        title="扫描设备删除失败"
        compact
        :show-retry="false"
        style="margin-bottom: 16px"
      />

      <!-- 设备表格 -->
      <UiDataTable
        v-if="!devicesLoadError"
        :columns="columns"
        :data-source="devices"
        :loading="loading"
        :show-pagination="false"
        row-key="id"
        size="middle"
        flat
        :total="devices.length"
        bordered
      >
        <template #bodyCell="{ column, index }">
          <template v-if="column.key === 'interfaceMode'">
            <a-tag :color="interfaceModeColorOf(devices[index].interfaceMode)">
              {{ interfaceModeLabelOf(devices[index].interfaceMode) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColorOf(devices[index].status)">
              {{ statusLabelOf(devices[index].status) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'endpointOnlineStatus'">
            <a-tag :color="endpointOnlineStatusColorOf(devices[index].endpointOnlineStatus)">
              {{ endpointOnlineStatusLabelOf(devices[index].endpointOnlineStatus) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'agentVersion'">
            <span v-if="devices[index].agentVersion">{{ devices[index].agentVersion }}</span>
            <span v-else class="text-muted">未激活</span>
          </template>
          <template v-else-if="column.key === 'pushTokenMasked'">
            <span v-if="devices[index].pushTokenMasked" class="mono">
              {{ devices[index].pushTokenMasked }}
            </span>
            <span v-else class="text-muted">—</span>
          </template>
          <template v-else-if="column.key === 'lastSeenAt'">
            <span v-if="devices[index].lastSeenAt">{{ devices[index].lastSeenAt }}</span>
            <span v-else class="text-muted">从未通讯</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <div class="operations-cell">
              <a class="op-link" @click="handleViewDetail(devices[index])">详情</a>
              <a class="op-link" @click="handleEdit(devices[index])">编辑</a>
              <a
                v-if="devices[index].interfaceMode === 'HTTP_PUSH'"
                class="op-link"
                @click="handleResetToken(devices[index])"
              >
                重置 token
              </a>
              <a
                v-if="devices[index].interfaceMode === 'HTTP_PUSH'"
                class="op-link"
                @click="handleCreateActivationCode(devices[index])"
              >
                激活码
              </a>
              <a
                v-if="devices[index].interfaceMode === 'SANE_PULL'"
                class="op-link"
                @click="handleOpenSaneTrigger(devices[index])"
              >
                采集
              </a>
              <a
                v-if="devices[index].endpointMachineCode"
                class="op-link op-link--danger"
                @click="handleUnbindAgent(devices[index])"
              >
                解绑 Agent
              </a>
              <a class="op-link op-link--danger" @click="handleDelete(devices[index])">删除</a>
            </div>
          </template>
        </template>
      </UiDataTable>
    </div>

    <!-- 新增/编辑设备弹窗 -->
    <a-modal
      v-model:open="showFormModal"
      :title="formMode === 'create' ? '新增扫描设备' : '编辑扫描设备'"
      width="720px"
      :confirm-loading="formSubmitting"
      destroy-on-close
      @ok="handleFormSubmit"
      @cancel="showFormModal = false"
    >
      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        :label-col="{ span: 7 }"
        :wrapper-col="{ span: 16 }"
      >
        <UiErrorRetryPanel
          v-if="formSubmitError"
          :error="formSubmitError"
          title="扫描设备保存失败"
          compact
          :show-retry="false"
          style="margin-bottom: 16px"
        />
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item name="scannerDeviceId" label="设备业务ID">
              <a-input
                v-model:value="formData.scannerDeviceId"
                placeholder="租户内唯一，建议厂商型号-编号"
                :disabled="formMode === 'edit'"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item name="scannerStationId" label="站点ID">
              <a-input
                v-model:value="formData.scannerStationId"
                placeholder="同一物理位置可有多台设备"
                :disabled="formMode === 'edit'"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item name="deviceName" label="设备名称">
              <a-input v-model:value="formData.deviceName" placeholder="教师可读的设备名" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item name="interfaceMode" label="接入模式">
              <a-select
                v-model:value="formData.interfaceMode"
                :options="interfaceModeOptions"
                placeholder="选择接入模式"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item name="status" label="设备状态">
              <a-select v-model:value="formData.status" :options="statusOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item name="scannerIp" label="设备 IP">
              <a-input
                v-model:value="formData.scannerIp"
                placeholder="可空，HTTP 推送时事件上报会刷新"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item name="kioskLockEnabled" label="Kiosk 防误触锁">
              <a-switch
                v-model:checked="formData.kioskLockEnabled"
                checked-children="启用"
                un-checked-children="关闭"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <!-- HTTP_PUSH 专属字段 -->
        <template v-if="formData.interfaceMode === 'HTTP_PUSH'">
          <a-divider orientation="left">HTTP 推送配置</a-divider>
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item name="defaultExamId" label="默认归属考试">
                <a-select
                  v-model:value="formData.defaultExamId"
                  placeholder="可空，扫描仪未指定时使用"
                  :loading="examListLoading"
                  :options="examOptions"
                  show-search
                  allow-clear
                  :filter-option="filterExamOption"
                />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item name="defaultClassIds" label="默认归属班级ID">
                <a-select
                  v-model:value="formData.defaultClassIds"
                  mode="multiple"
                  placeholder="请选择默认归属班级"
                  :loading="classListLoading"
                  :options="classOptions"
                  show-search
                  allow-clear
                  :filter-option="filterClassOption"
                />
              </a-form-item>
            </a-col>
          </a-row>
        </template>

        <!-- SANE_PULL 专属字段 -->
        <template v-if="formData.interfaceMode === 'SANE_PULL'">
          <a-divider orientation="left">SANE 主动采集配置</a-divider>
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item name="saneHost" label="saned 主机">
                <a-input v-model:value="formData.saneHost" placeholder="如 192.168.1.20" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item name="sanePort" label="saned 端口">
                <a-input-number
                  v-model:value="formData.sanePort"
                  :min="1"
                  :max="65535"
                  placeholder="默认 6566"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
          </a-row>
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item name="saneDeviceName" label="SANE 设备名">
                <a-input
                  v-model:value="formData.saneDeviceName"
                  placeholder="如 epson2:net:192.168.1.20"
                />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item
                name="saneResolution"
                label="扫描分辨率 DPI"
                extra="阅卷 OCR 下限 300 DPI；低于该阈值会损害手写体识别。"
              >
                <a-input-number
                  v-model:value="formData.saneResolution"
                  :min="300"
                  :max="1200"
                  placeholder="默认 300；不能低于 300"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
          </a-row>
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item name="saneColorMode" label="色彩模式">
                <a-select v-model:value="formData.saneColorMode" :options="colorModeOptions" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item name="saneDuplexMode" label="双面模式">
                <a-select v-model:value="formData.saneDuplexMode" :options="duplexModeOptions" />
              </a-form-item>
            </a-col>
          </a-row>
        </template>

        <a-divider orientation="left">运维信息（可选）</a-divider>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item name="manufacturer" label="厂商">
              <a-input
                v-model:value="formData.manufacturer"
                placeholder="如 EPSON / Canon / 富士通"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item name="model" label="型号">
              <a-input v-model:value="formData.model" placeholder="设备型号" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item name="location" label="物理位置">
              <a-input v-model:value="formData.location" placeholder="如 教学楼A栋 301 教研室" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item name="remark" label="备注">
              <a-input v-model:value="formData.remark" placeholder="维护备注" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- token 显示弹窗（创建 / 重置 / 详情共用） -->
    <a-modal
      v-model:open="showTokenModal"
      title="HTTP 推送配置"
      width="700px"
      :footer="null"
      destroy-on-close
    >
      <a-alert
        type="warning"
        show-icon
        message="请妥善保管 push_token，关闭对话框后将仅展示掩码版本。"
        style="margin-bottom: 16px"
      />
      <UiErrorRetryPanel
        v-if="tokenActionError"
        :error="tokenActionError"
        title="HTTP 推送配置操作失败"
        compact
        :show-retry="false"
        style="margin-bottom: 16px"
      />
      <a-descriptions v-if="tokenInfo" bordered :column="1" size="small">
        <a-descriptions-item label="设备主键ID">
          <span class="mono">{{ tokenInfo?.id }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="明文 push_token">
          <div class="token-row">
            <span class="mono token-text">{{ tokenInfo?.pushToken }}</span>
            <a-button size="small" @click="copyText(tokenInfo?.pushToken)">复制</a-button>
          </div>
        </a-descriptions-item>
        <a-descriptions-item label="推送 URL（相对路径）">
          <div class="token-row">
            <span class="mono token-text">{{ tokenInfo?.pushUrl }}</span>
            <a-button size="small" @click="copyText(absolutePushUrl)">复制完整 URL</a-button>
          </div>
        </a-descriptions-item>
        <a-descriptions-item label="完整 URL（基于当前域）">
          <span class="mono token-text">{{ absolutePushUrl }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="Authorization 请求头">
          <div class="token-row">
            <span class="mono token-text">{{ tokenInfo?.authorizationHeader }}</span>
            <a-button size="small" @click="copyText(tokenInfo?.authorizationHeader)">复制</a-button>
          </div>
        </a-descriptions-item>
      </a-descriptions>
      <p style="margin-top: 12px" class="text-muted">
        在扫描仪/复合机后台填入上述 URL 与 Authorization 头；其余字段（examId、scanStartTime
        等）按表单字段提交。
      </p>
    </a-modal>

    <!-- 设备详情弹窗 -->
    <a-modal
      v-model:open="showDetailModal"
      title="扫描设备详情"
      width="720px"
      :footer="null"
      destroy-on-close
    >
      <UiErrorRetryPanel
        v-if="detailLoadError"
        :error="detailLoadError"
        title="扫描设备详情加载失败"
        compact
        :show-retry="false"
        style="margin-bottom: 16px"
      />
      <a-descriptions v-if="detailInfo" bordered :column="2" size="small">
        <a-descriptions-item label="设备名称">{{ detailInfo.deviceName }}</a-descriptions-item>
        <a-descriptions-item label="设备业务ID">
          {{ detailInfo.scannerDeviceId }}
        </a-descriptions-item>
        <a-descriptions-item label="站点ID">{{ detailInfo.scannerStationId }}</a-descriptions-item>
        <a-descriptions-item label="设备状态">
          <a-tag :color="statusColorOf(detailInfo.status)">
            {{ statusLabelOf(detailInfo.status) }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="接入模式">
          <a-tag :color="interfaceModeColorOf(detailInfo.interfaceMode)">
            {{ interfaceModeLabelOf(detailInfo.interfaceMode) }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="设备 IP">{{ detailInfo.scannerIp || '—' }}</a-descriptions-item>
        <a-descriptions-item label="Kiosk 防误触锁">
          <a-tag :color="detailInfo.kioskLockEnabled === false ? 'warning' : 'success'">
            {{ detailInfo.kioskLockEnabled === false ? '已关闭' : '已启用' }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="Agent 在线状态">
          <a-tag :color="endpointOnlineStatusColorOf(detailInfo.endpointOnlineStatus)">
            {{ endpointOnlineStatusLabelOf(detailInfo.endpointOnlineStatus) }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="Agent 版本">
          {{ detailInfo.agentVersion || '未激活' }}
        </a-descriptions-item>
        <a-descriptions-item label="客户端版本">
          {{ detailInfo.clientVersion || '—' }}
        </a-descriptions-item>
        <a-descriptions-item label="端点名称">
          {{ detailInfo.endpointName || '—' }}
        </a-descriptions-item>
        <a-descriptions-item label="扫描仪连接">
          {{ detailInfo.scannerConnected === true ? '已连接' : '未连接或未上报' }}
        </a-descriptions-item>
        <a-descriptions-item label="本地队列">
          任务 {{ detailInfo.pendingJobCount ?? '未上报' }} / 待上传页
          {{ detailInfo.pendingUploadPageCount ?? '未上报' }}
        </a-descriptions-item>
        <a-descriptions-item label="最近心跳">
          {{ detailInfo.lastHeartbeatAt || '从未心跳' }}
        </a-descriptions-item>
        <a-descriptions-item label="Agent 诊断">
          {{ detailInfo.diagnosticStatus || '—' }} {{ detailInfo.diagnosticMessage || '' }}
        </a-descriptions-item>
        <template v-if="detailInfo.interfaceMode === 'HTTP_PUSH'">
          <a-descriptions-item label="默认归属考试ID">
            {{ detailInfo.defaultExamId || '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="默认归属班级ID">
            <span v-if="detailInfo.defaultClassIds?.length">
              {{ detailInfo.defaultClassIds.join(', ') }}
            </span>
            <span v-else>—</span>
          </a-descriptions-item>
          <a-descriptions-item label="明文 push_token" :span="2">
            <div class="token-row">
              <span class="mono token-text">{{ detailInfo.pushToken || '—' }}</span>
              <a-button
                v-if="detailInfo.pushToken"
                size="small"
                @click="copyText(detailInfo.pushToken)"
              >
                复制
              </a-button>
            </div>
          </a-descriptions-item>
          <a-descriptions-item label="推送 URL" :span="2">
            <span class="mono token-text">{{ buildAbsolutePushUrl(detailInfo.pushUrl) }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="Authorization 请求头" :span="2">
            <span class="mono token-text">{{ detailInfo.authorizationHeader || '—' }}</span>
          </a-descriptions-item>
        </template>
        <template v-if="detailInfo.interfaceMode === 'SANE_PULL'">
          <a-descriptions-item label="saned 主机">
            {{ formatSaneEndpoint(detailInfo) }}
          </a-descriptions-item>
          <a-descriptions-item label="SANE 设备名">
            {{ detailInfo.saneDeviceName || '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="分辨率">
            {{ detailInfo.saneResolution || '—' }} DPI
          </a-descriptions-item>
          <a-descriptions-item label="色彩 / 双面">
            {{ detailInfo.saneColorMode || '—' }} / {{ detailInfo.saneDuplexMode || '—' }}
          </a-descriptions-item>
        </template>
        <a-descriptions-item label="厂商">{{ detailInfo.manufacturer || '—' }}</a-descriptions-item>
        <a-descriptions-item label="型号">{{ detailInfo.model || '—' }}</a-descriptions-item>
        <a-descriptions-item label="物理位置" :span="2">
          {{ detailInfo.location || '—' }}
        </a-descriptions-item>
        <a-descriptions-item label="最近通讯时间">
          {{ detailInfo.lastSeenAt || '从未通讯' }}
        </a-descriptions-item>
        <a-descriptions-item label="创建时间">
          {{ detailInfo.createTime || '—' }}
        </a-descriptions-item>
        <a-descriptions-item label="备注" :span="2">
          {{ detailInfo.remark || '—' }}
        </a-descriptions-item>
      </a-descriptions>
    </a-modal>

    <a-modal
      v-model:open="showActivationCodeModal"
      title="扫描 Agent 激活码"
      width="520px"
      :footer="null"
      destroy-on-close
    >
      <UiErrorRetryPanel
        v-if="activationCodeError"
        :error="activationCodeError"
        title="扫描 Agent 激活码生成失败"
        compact
        :show-retry="false"
        style="margin-bottom: 16px"
      />
      <div v-if="activationCodeInfo" class="activation-code-modal">
        <div class="activation-code-modal__device">
          {{ activationCodeDeviceName }}
        </div>
        <AQrcode
          v-if="activationCodeInfo.activationCode"
          :value="activationCodeInfo.activationCode"
          :size="220"
          error-level="M"
        />
        <div class="activation-code-modal__code mono">
          {{ activationCodeInfo.activationCode }}
        </div>
        <div class="activation-code-modal__meta">
          <span>设备业务ID：{{ activationCodeInfo.scannerDeviceId }}</span>
          <span>扫描站点：{{ activationCodeInfo.scannerStationId }}</span>
          <span>有效期至：{{ activationCodeInfo.expireAt }}</span>
        </div>
        <a-space>
          <a-button type="primary" @click="copyText(activationCodeInfo.activationCode)">
            复制激活码
          </a-button>
          <a-button @click="showActivationCodeModal = false"> 关闭 </a-button>
        </a-space>
      </div>
    </a-modal>

    <!-- SANE 触发采集弹窗 -->
    <a-modal
      v-model:open="showSaneModal"
      title="SANE 主动采集"
      width="640px"
      :confirm-loading="saneSubmitting"
      destroy-on-close
      @ok="handleSaneSubmit"
      @cancel="showSaneModal = false"
    >
      <a-alert
        type="info"
        show-icon
        message="服务端会通过 SANE 协议连接设备并按期望页数采集，每页编为 PNG 上传 edu-storage 后入库。"
        style="margin-bottom: 16px"
      />
      <UiErrorRetryPanel
        v-if="saneSubmitError"
        :error="saneSubmitError"
        title="SANE 主动采集失败"
        compact
        :show-retry="false"
        style="margin-bottom: 16px"
      />
      <UiErrorRetryPanel
        v-if="classListLoadError"
        :error="classListLoadError"
        title="班级列表加载失败"
        compact
        @retry="loadClassList"
        style="margin-bottom: 16px"
      />
      <UiErrorRetryPanel
        v-if="examListLoadError"
        :error="examListLoadError"
        title="考试列表加载失败"
        compact
        @retry="loadExamList"
        style="margin-bottom: 16px"
      />
      <a-form
        ref="saneFormRef"
        :model="saneFormData"
        :rules="saneFormRules"
        :label-col="{ span: 7 }"
        :wrapper-col="{ span: 16 }"
      >
        <a-form-item label="设备">
          <span>{{ saneTargetDevice?.deviceName }} ({{ saneTargetDevice?.scannerDeviceId }})</span>
        </a-form-item>
        <a-form-item name="examId" label="考试">
          <a-select
            v-model:value="saneFormData.examId"
            placeholder="请选择考试"
            :loading="examListLoading"
            :options="examOptions"
            show-search
            allow-clear
            :filter-option="filterExamOption"
          />
        </a-form-item>
        <a-form-item name="declaredClassIds" label="上报班级ID">
          <a-select
            v-model:value="saneFormData.declaredClassIds"
            mode="multiple"
            placeholder="请选择上报班级"
            :loading="classListLoading"
            :options="classOptions"
            show-search
            allow-clear
            :filter-option="filterClassOption"
          />
        </a-form-item>
        <a-form-item name="expectedPages" label="期望采集页数">
          <a-input-number
            v-model:value="saneFormData.expectedPages"
            :min="1"
            :max="500"
            placeholder="ADF 进纸时建议设置上限"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="批次外部编号（可选）">
          <a-input v-model:value="saneFormData.batchExternalNo" placeholder="留空由服务端生成" />
        </a-form-item>
        <a-form-item label="临时分辨率覆盖（可选）">
          <a-input-number
            v-model:value="saneFormData.resolutionOverride"
            :min="300"
            :max="1200"
            placeholder="留空使用设备默认；低于 300 DPI 会被阻断"
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { DefaultOptionType } from 'ant-design-vue/es/select'
import type { ClassInfoDto } from '@/apis/edu/class'
import { getAllClasses } from '@/apis/edu/class'
import type {
  ExamScannerActivationCodeVO,
  ExamScannerDeviceCreatePayload,
  ExamScannerDeviceDetailVO,
  ExamScannerDeviceQueryPayload,
  ExamScannerDeviceTokenVO,
  ExamScannerDeviceUpdatePayload,
  ExamScannerDeviceVO,
  MarkExamSummaryVO,
  ScannerColorModeCode,
  ScannerDeviceStatusCode,
  ScannerDuplexModeCode,
  ScannerEndpointOnlineStatusCode,
  ScannerInterfaceModeCode,
} from '@/apis/mark/exam-mark-scanner'
import {
  createScannerActivationCode,
  createScannerDevice,
  deleteScannerDevice,
  getScannerDeviceDetail,
  listScannerDevices,
  pageMarkExams,
  resetScannerDevicePushToken,
  SCANNER_DEVICE_STATUS_COLOR,
  SCANNER_DEVICE_STATUS_LABEL,
  SCANNER_ENDPOINT_ONLINE_STATUS_COLOR,
  SCANNER_ENDPOINT_ONLINE_STATUS_LABEL,
  SCANNER_INTERFACE_MODE_COLOR,
  SCANNER_INTERFACE_MODE_LABEL,
  triggerSaneScan,
  unbindScannerDeviceAgent,
  updateScannerDevice,
} from '@/apis/mark/exam-mark-scanner'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import message from 'ant-design-vue/es/message'
import AQrcode from 'ant-design-vue/es/qrcode'
import { computed, onMounted, reactive, ref } from 'vue'
import { UiDataTable, UiErrorRetryPanel } from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'

defineOptions({ name: 'PrinterManagement' })

const authStore = useAuthStore()
const userStore = useUserStore()

// ─── 列表与筛选 ───────────────────────────────────────
const loading = ref(false)
const devicesLoadError = ref<unknown>(null)
const classListLoadError = ref<unknown>(null)
const examListLoadError = ref<unknown>(null)
const devices = ref<ExamScannerDeviceVO[]>([])
const searchForm = ref<ExamScannerDeviceQueryPayload>({})
const classListLoading = ref(false)
const classList = ref<ClassInfoDto[]>([])
const classOptions = computed(() =>
  classList.value.map((item) => ({
    label: [item.className, item.majorName].filter(Boolean).join(' / '),
    value: String(item.id),
  })),
)
const examListLoading = ref(false)
const examList = ref<MarkExamSummaryVO[]>([])
const examOptions = computed(() =>
  examList.value.map((item) => ({
    label: [formatExamOptionLabel(item), formatAcademicTerm(item)].filter(Boolean).join(' · '),
    value: item.examId,
  })),
)
const showActivationCodeModal = ref(false)
const activationCodeInfo = ref<ExamScannerActivationCodeVO | null>(null)
const activationCodeDeviceName = ref('')
const activationCodeError = ref<unknown>(null)

const interfaceModeOptions = [
  { value: 'HTTP_PUSH', label: SCANNER_INTERFACE_MODE_LABEL.HTTP_PUSH },
  { value: 'SANE_PULL', label: SCANNER_INTERFACE_MODE_LABEL.SANE_PULL },
]

const statusOptions = [
  { value: 'ACTIVE', label: SCANNER_DEVICE_STATUS_LABEL.ACTIVE },
  { value: 'INACTIVE', label: SCANNER_DEVICE_STATUS_LABEL.INACTIVE },
  { value: 'DISABLED', label: SCANNER_DEVICE_STATUS_LABEL.DISABLED },
]

const colorModeOptions = [
  { value: 'COLOR', label: '彩色 COLOR' },
  { value: 'GRAY', label: '灰度 GRAY' },
  { value: 'LINEART', label: '黑白 LINEART' },
]

const duplexModeOptions = [
  { value: 'SIMPLEX', label: '单面 SIMPLEX' },
  { value: 'DUPLEX', label: '双面 DUPLEX' },
]

const columns = [
  { title: '设备名称', dataIndex: 'deviceName', key: 'deviceName', width: 160 },
  { title: '业务ID', dataIndex: 'scannerDeviceId', key: 'scannerDeviceId', width: 160 },
  { title: '站点', dataIndex: 'scannerStationId', key: 'scannerStationId', width: 120 },
  { title: '接入模式', dataIndex: 'interfaceMode', key: 'interfaceMode', width: 130 },
  { title: 'IP', dataIndex: 'scannerIp', key: 'scannerIp', width: 130 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
  { title: 'Agent', dataIndex: 'endpointOnlineStatus', key: 'endpointOnlineStatus', width: 100 },
  { title: 'Agent 版本', dataIndex: 'agentVersion', key: 'agentVersion', width: 120 },
  { title: 'push_token', dataIndex: 'pushTokenMasked', key: 'pushTokenMasked', width: 130 },
  { title: '最近通讯', dataIndex: 'lastSeenAt', key: 'lastSeenAt', width: 170 },
  { title: '位置', dataIndex: 'location', key: 'location', width: 160, ellipsis: true },
  { title: '操作', dataIndex: 'action', key: 'action', width: 260, fixed: 'right' as const },
]

// helper 严格只接受后端枚举类型，零 as 断言。
function statusLabelOf(status?: ScannerDeviceStatusCode): string {
  if (!status) return '—'
  return SCANNER_DEVICE_STATUS_LABEL[status] ?? status
}
function statusColorOf(status?: ScannerDeviceStatusCode): string {
  if (!status) return 'default'
  return SCANNER_DEVICE_STATUS_COLOR[status] ?? 'default'
}
function interfaceModeLabelOf(mode?: ScannerInterfaceModeCode): string {
  if (!mode) return '—'
  return SCANNER_INTERFACE_MODE_LABEL[mode] ?? mode
}
function interfaceModeColorOf(mode?: ScannerInterfaceModeCode): string {
  if (!mode) return 'default'
  return SCANNER_INTERFACE_MODE_COLOR[mode] ?? 'default'
}
function endpointOnlineStatusLabelOf(status?: ScannerEndpointOnlineStatusCode): string {
  if (!status) return '未激活'
  return SCANNER_ENDPOINT_ONLINE_STATUS_LABEL[status] ?? status
}
function endpointOnlineStatusColorOf(status?: ScannerEndpointOnlineStatusCode): string {
  if (!status) return 'default'
  return SCANNER_ENDPOINT_ONLINE_STATUS_COLOR[status] ?? 'default'
}

async function loadDevices(): Promise<void> {
  loading.value = true
  devicesLoadError.value = null
  agentUnbindError.value = null
  deviceDeleteError.value = null
  try {
    const result = await listScannerDevices(searchForm.value)
    if (!Array.isArray(result)) {
      devicesLoadError.value = new TypeError('扫描设备列表响应格式异常')
      message.error('扫描设备列表响应格式异常')
      return
    }
    devices.value = result
  } catch (error) {
    devicesLoadError.value = error
    const errMsg = error instanceof Error ? error.message : '设备列表加载失败'
    message.error(errMsg)
  } finally {
    loading.value = false
  }
}

function handleSearch(): void {
  loadDevices()
}

function handleResetSearch(): void {
  searchForm.value = {}
  loadDevices()
}

// ─── 新建/编辑弹窗 ────────────────────────────────────
const showFormModal = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const formSubmitting = ref(false)
const formSubmitError = ref<unknown>(null)
const formRef = ref<FormInstance | null>(null)

interface FormState {
  id?: string
  scannerDeviceId: string
  scannerStationId: string
  deviceName: string
  interfaceMode: ScannerInterfaceModeCode
  scannerIp?: string
  status: ScannerDeviceStatusCode
  saneHost?: string
  sanePort?: number
  saneDeviceName?: string
  saneResolution?: number
  saneColorMode?: ScannerColorModeCode
  saneDuplexMode?: ScannerDuplexModeCode
  defaultExamId?: string
  defaultClassIds?: string[]
  manufacturer?: string
  model?: string
  location?: string
  kioskLockEnabled: boolean
  remark?: string
}

function defaultFormState(): FormState {
  return {
    scannerDeviceId: '',
    scannerStationId: '',
    deviceName: '',
    interfaceMode: 'HTTP_PUSH',
    scannerIp: '',
    status: 'ACTIVE',
    sanePort: 6566,
    saneResolution: 300,
    saneColorMode: 'COLOR',
    saneDuplexMode: 'SIMPLEX',
    defaultClassIds: [],
    kioskLockEnabled: true,
  }
}

const formData = reactive<FormState>(defaultFormState())

const formRules: Record<string, Rule[]> = {
  scannerDeviceId: [{ required: true, message: '请输入设备业务ID' }],
  scannerStationId: [{ required: true, message: '请输入站点ID' }],
  deviceName: [{ required: true, message: '请输入设备名称' }],
  interfaceMode: [{ required: true, message: '请选择接入模式' }],
  status: [{ required: true, message: '请选择设备状态' }],
}

function resetForm(): void {
  Object.assign(formData, defaultFormState())
}

function handleCreate(): void {
  formMode.value = 'create'
  formSubmitError.value = null
  tokenInfo.value = null
  resetForm()
  showFormModal.value = true
}

function handleEdit(record: ExamScannerDeviceVO): void {
  formMode.value = 'edit'
  formSubmitError.value = null
  resetForm()
  Object.assign(formData, {
    id: record.id,
    scannerDeviceId: record.scannerDeviceId,
    scannerStationId: record.scannerStationId,
    deviceName: record.deviceName,
    interfaceMode: record.interfaceMode,
    scannerIp: record.scannerIp ?? '',
    status: record.status,
    saneHost: record.saneHost ?? '',
    sanePort: record.sanePort,
    saneDeviceName: record.saneDeviceName ?? '',
    saneResolution: record.saneResolution,
    saneColorMode: record.saneColorMode,
    saneDuplexMode: record.saneDuplexMode,
    defaultExamId: record.defaultExamId ?? '',
    defaultClassIds: record.defaultClassIds,
    manufacturer: record.manufacturer ?? '',
    model: record.model ?? '',
    location: record.location ?? '',
    kioskLockEnabled: record.kioskLockEnabled,
    remark: record.remark ?? '',
  })
  showFormModal.value = true
}

async function handleFormSubmit(): Promise<void> {
  await formRef.value?.validate()
  formSubmitError.value = null
  if (formData.interfaceMode === 'SANE_PULL') {
    if (!formData.saneHost || !formData.saneDeviceName) {
      message.error('SANE_PULL 模式下必须填写 saned 主机与 SANE 设备名')
      return
    }
  }
  formSubmitting.value = true
  try {
    if (formMode.value === 'create') {
      const payload: ExamScannerDeviceCreatePayload = {
        scannerDeviceId: formData.scannerDeviceId.trim(),
        scannerStationId: formData.scannerStationId.trim(),
        deviceName: formData.deviceName.trim(),
        interfaceMode: formData.interfaceMode,
        scannerIp: emptyToUndefined(formData.scannerIp),
        status: formData.status,
        saneHost: emptyToUndefined(formData.saneHost),
        sanePort: formData.sanePort,
        saneDeviceName: emptyToUndefined(formData.saneDeviceName),
        saneResolution: formData.saneResolution,
        saneColorMode: formData.saneColorMode,
        saneDuplexMode: formData.saneDuplexMode,
        defaultExamId: emptyToUndefined(formData.defaultExamId),
        defaultClassIds: formData.defaultClassIds,
        manufacturer: emptyToUndefined(formData.manufacturer),
        model: emptyToUndefined(formData.model),
        location: emptyToUndefined(formData.location),
        kioskLockEnabled: formData.kioskLockEnabled,
        remark: emptyToUndefined(formData.remark),
      }
      const tokenInfo = await createScannerDevice(payload)
      message.success('扫描设备创建成功')
      showFormModal.value = false
      if (formData.interfaceMode === 'HTTP_PUSH' && tokenInfo.pushToken) {
        openTokenModal(tokenInfo)
      }
      await loadDevices()
    } else {
      const payload: ExamScannerDeviceUpdatePayload = {
        id: formData.id!,
        deviceName: formData.deviceName.trim(),
        interfaceMode: formData.interfaceMode,
        scannerIp: emptyToUndefined(formData.scannerIp),
        status: formData.status,
        saneHost: emptyToUndefined(formData.saneHost),
        sanePort: formData.sanePort,
        saneDeviceName: emptyToUndefined(formData.saneDeviceName),
        saneResolution: formData.saneResolution,
        saneColorMode: formData.saneColorMode,
        saneDuplexMode: formData.saneDuplexMode,
        defaultExamId: emptyToUndefined(formData.defaultExamId),
        defaultClassIds: formData.defaultClassIds,
        manufacturer: emptyToUndefined(formData.manufacturer),
        model: emptyToUndefined(formData.model),
        location: emptyToUndefined(formData.location),
        kioskLockEnabled: formData.kioskLockEnabled,
        remark: emptyToUndefined(formData.remark),
      }
      await updateScannerDevice(payload)
      message.success('扫描设备已更新')
      showFormModal.value = false
      await loadDevices()
    }
  } catch (error) {
    formSubmitError.value = error
    const errMsg = error instanceof Error ? error.message : '扫描设备保存失败'
    message.error(errMsg)
  } finally {
    formSubmitting.value = false
  }
}

function emptyToUndefined(value?: string): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

// ─── token 显示弹窗 ───────────────────────────────────
const showTokenModal = ref(false)
const tokenInfo = ref<ExamScannerDeviceTokenVO | null>(null)
const tokenActionError = ref<unknown>(null)

const absolutePushUrl = computed(() => buildAbsolutePushUrl(tokenInfo.value?.pushUrl))

function buildAbsolutePushUrl(relativeUrl?: string): string {
  if (!relativeUrl) return ''
  if (typeof window === 'undefined') return relativeUrl
  return window.location.origin + relativeUrl
}

function openTokenModal(info: ExamScannerDeviceTokenVO): void {
  tokenInfo.value = info
  tokenActionError.value = null
  showTokenModal.value = true
}

async function handleResetToken(record: ExamScannerDeviceVO): Promise<void> {
  void confirmAsync({
    title: '重置 push_token',
    content: `重置后旧 token 立即失效，扫描仪后台需要重新填入。是否继续？设备：${record.deviceName}`,
    type: 'warning',
    onOk: async () => {
      try {
        tokenActionError.value = null
        tokenInfo.value = null
        showTokenModal.value = true
        const result = await resetScannerDevicePushToken(record.id)
        message.success('push_token 已重置')
        openTokenModal(result)
        await loadDevices()
      } catch (error) {
        tokenActionError.value = error
        const errMsg = error instanceof Error ? error.message : 'push_token 重置失败'
        message.error(errMsg)
      }
    },
  })
}

async function handleCreateActivationCode(record: ExamScannerDeviceVO): Promise<void> {
  activationCodeDeviceName.value = record.deviceName || record.scannerDeviceId || '扫描设备'
  activationCodeInfo.value = null
  showActivationCodeModal.value = true
  activationCodeError.value = null
  try {
    activationCodeInfo.value = await createScannerActivationCode({ deviceId: record.id })
  } catch (error) {
    activationCodeError.value = error
    const errMsg = error instanceof Error ? error.message : '扫描 Agent 激活码生成失败'
    message.error(errMsg)
  }
}

const agentUnbindError = ref<unknown>(null)

const deviceDeleteError = ref<unknown>(null)

function showActionError(error: unknown, fallback: string): void {
  const errMsg = error instanceof Error ? error.message : fallback
  message.error(errMsg)
}

function handleUnbindAgent(record: ExamScannerDeviceVO): void {
  void confirmAsync({
    title: '解绑扫描 Agent',
    content: `确定解绑设备"${record.deviceName}"当前 Agent 吗？解绑后原一体机需要重新使用激活码绑定。`,
    type: 'warning',
    onOk: async () => {
      try {
        agentUnbindError.value = null
        await unbindScannerDeviceAgent(record.id)
        message.success('扫描 Agent 已解绑')
        await loadDevices()
      } catch (error) {
        agentUnbindError.value = error
        showActionError(error, '扫描 Agent 解绑失败')
      }
    },
  })
}

function copyText(value?: string | null): void {
  if (!value) return
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(value).then(
      () => message.success('已复制到剪贴板'),
      () => message.error('复制失败，请手动选择文本'),
    )
    return
  }
  message.warning('当前浏览器不支持剪贴板 API，请手动复制')
}

// ─── 详情弹窗 ────────────────────────────────────────
const showDetailModal = ref(false)
const detailInfo = ref<ExamScannerDeviceDetailVO | null>(null)
const detailLoadError = ref<unknown>(null)

async function handleViewDetail(record: ExamScannerDeviceVO): Promise<void> {
  detailInfo.value = null
  showDetailModal.value = true
  detailLoadError.value = null
  try {
    detailInfo.value = await getScannerDeviceDetail(record.id)
  } catch (error) {
    detailLoadError.value = error
    const errMsg = error instanceof Error ? error.message : '扫描设备详情加载失败'
    message.error(errMsg)
  }
}

// ─── 删除 ────────────────────────────────────────────
function handleDelete(record: ExamScannerDeviceVO): void {
  void confirmAsync({
    title: '删除扫描设备',
    content: `确定删除设备"${record.deviceName}"吗？历史扫描事件保持引用，仅当前设备记录被逻辑删除。`,
    type: 'error',
    onOk: async () => {
      try {
        deviceDeleteError.value = null
        await deleteScannerDevice(record.id)
        message.success('扫描设备已删除')
        await loadDevices()
      } catch (error) {
        deviceDeleteError.value = error
        showActionError(error, '扫描设备删除失败')
      }
    },
  })
}

// ─── SANE 主动采集弹窗 ────────────────────────────────
const showSaneModal = ref(false)
const saneSubmitting = ref(false)
const saneSubmitError = ref<unknown>(null)
const saneFormRef = ref<FormInstance | null>(null)
const saneTargetDevice = ref<ExamScannerDeviceVO | null>(null)

interface SaneFormState {
  examId: string
  declaredClassIds: string[]
  expectedPages: number
  batchExternalNo?: string
  resolutionOverride?: number
}

const saneFormData = reactive<SaneFormState>({
  examId: '',
  declaredClassIds: [],
  expectedPages: 1,
})

const saneFormRules: Record<string, Rule[]> = {
  examId: [{ required: true, message: '请输入考试ID' }],
  declaredClassIds: [{ required: true, message: '请至少输入一个班级ID' }],
  expectedPages: [{ required: true, type: 'number', message: '请输入期望采集页数' }],
}

function handleOpenSaneTrigger(record: ExamScannerDeviceVO): void {
  if (record.interfaceMode !== 'SANE_PULL') {
    message.error('仅 SANE 主动采集设备支持此操作')
    return
  }
  if (record.status !== 'ACTIVE') {
    message.error('设备未启用，不能触发 SANE 主动采集')
    return
  }
  if (!record.saneHost || !record.saneDeviceName) {
    message.error('SANE 设备配置不完整，请先补齐 saned 主机与 SANE 设备名')
    return
  }
  if (record.saneResolution !== undefined && record.saneResolution < 300) {
    message.error('SANE 设备默认分辨率低于 300 DPI，请先修正设备配置')
    return
  }
  saneTargetDevice.value = record
  saneSubmitError.value = null
  Object.assign(saneFormData, {
    examId: record.defaultExamId ?? '',
    declaredClassIds: record.defaultClassIds,
    expectedPages: 1,
    batchExternalNo: undefined,
    resolutionOverride: undefined,
  })
  showSaneModal.value = true
}

async function handleSaneSubmit(): Promise<void> {
  await saneFormRef.value?.validate()
  saneSubmitError.value = null
  if (!saneTargetDevice.value) {
    message.error('未选择 SANE 扫描设备，请重新打开采集窗口')
    return
  }
  saneSubmitting.value = true
  try {
    const result = await triggerSaneScan({
      deviceId: saneTargetDevice.value.id,
      examId: saneFormData.examId,
      declaredClassIds: saneFormData.declaredClassIds,
      expectedPages: saneFormData.expectedPages,
      batchExternalNo: saneFormData.batchExternalNo,
      resolutionOverride: saneFormData.resolutionOverride,
    })
    message.success(`采集完成：批次 ${result.scanBatchId}，共 ${result.pageCount} 页`, 4)
    showSaneModal.value = false
    await loadDevices()
  } catch (error) {
    saneSubmitError.value = error
    const errMsg = error instanceof Error ? error.message : 'SANE 主动采集失败'
    message.error(errMsg)
  } finally {
    saneSubmitting.value = false
  }
}

async function loadClassList(): Promise<void> {
  classListLoading.value = true
  try {
    classListLoadError.value = null
    classList.value = await getAllClasses()
  } catch (error) {
    classListLoadError.value = error
    const errMsg = error instanceof Error ? error.message : '班级列表加载失败'
    message.error(errMsg)
  } finally {
    classListLoading.value = false
  }
}

async function loadExamList(): Promise<void> {
  examListLoading.value = true
  try {
    examListLoadError.value = null
    const isAdminView = authStore.isAdmin || userStore.isTenantAdmin
    const result = await pageMarkExams({
      pageNum: 1,
      pageSize: 200,
      status: 'ACTIVE',
      createUserId: isAdminView ? null : userStore.userInfo.userId || undefined,
    })
    if (!Array.isArray(result.list)) {
      examListLoadError.value = new TypeError('考试列表接口返回格式错误')
      message.error('考试列表接口返回格式错误')
      return
    }
    examList.value = result.list
  } catch (error) {
    examListLoadError.value = error
    const errMsg = error instanceof Error ? error.message : '考试列表加载失败'
    message.error(errMsg)
  } finally {
    examListLoading.value = false
  }
}

function filterClassOption(input: string, option?: DefaultOptionType): boolean {
  return String(option?.label ?? '')
    .toLowerCase()
    .includes(input.toLowerCase())
}

function filterExamOption(input: string, option?: DefaultOptionType): boolean {
  return String(option?.label ?? '')
    .toLowerCase()
    .includes(input.toLowerCase())
}

function formatSemester(value?: string): string {
  if (value === '1') return '秋季学期'
  if (value === '2') return '春季学期'
  return value ?? ''
}

function formatAcademicTerm(exam: MarkExamSummaryVO): string {
  return [exam.academicYear, formatSemester(exam.semester) || exam.semester]
    .filter(Boolean)
    .join(' · ')
}

function formatSaneEndpoint(device: ExamScannerDeviceDetailVO): string {
  if (!device.saneHost && device.sanePort === undefined) return '—'
  if (!device.saneHost) return `未返回主机:${device.sanePort}`
  if (device.sanePort === undefined) return `${device.saneHost}:未返回端口`
  return `${device.saneHost}:${device.sanePort}`
}

function formatExamOptionLabel(exam: MarkExamSummaryVO): string {
  return exam.examNo ? `${exam.examName} (${exam.examNo})` : exam.examName
}

onMounted(() => {
  loadDevices()
  loadClassList()
  loadExamList()
})
</script>

<style scoped lang="scss">
.printer-management {
  &__workspace {
    padding: 0;
  }
}

.filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  .toolbar-actions {
    display: flex;
    gap: 8px;
  }
}

.operations-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.op-link {
  color: #2563eb;
  cursor: pointer;
  user-select: none;

  &:hover {
    text-decoration: underline;
  }

  &--danger {
    color: #dc2626;
  }
}

.text-muted {
  color: #94a3b8;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
}

.token-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.token-text {
  word-break: break-all;
}

.activation-code-modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;

  &__device {
    color: #334155;
    font-weight: 600;
  }

  &__code {
    padding: 10px 14px;
    border-radius: 10px;
    background: #f8fafc;
    color: #0f172a;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.08em;
    word-break: break-all;
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
    color: #64748b;
    font-size: 13px;
  }
}
</style>
