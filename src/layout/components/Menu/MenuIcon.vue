<script setup lang="ts">
import type { Component } from 'vue'
import ApartmentOutlined from '@ant-design/icons-vue/ApartmentOutlined'
import AppstoreOutlined from '@ant-design/icons-vue/AppstoreOutlined'
import AreaChartOutlined from '@ant-design/icons-vue/AreaChartOutlined'
import AuditOutlined from '@ant-design/icons-vue/AuditOutlined'
import BarChartOutlined from '@ant-design/icons-vue/BarChartOutlined'
import BellOutlined from '@ant-design/icons-vue/BellOutlined'
import BookOutlined from '@ant-design/icons-vue/BookOutlined'
import BulbOutlined from '@ant-design/icons-vue/BulbOutlined'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import CheckSquareOutlined from '@ant-design/icons-vue/CheckSquareOutlined'
import CloudOutlined from '@ant-design/icons-vue/CloudOutlined'
import CloudUploadOutlined from '@ant-design/icons-vue/CloudUploadOutlined'
import DashboardOutlined from '@ant-design/icons-vue/DashboardOutlined'
import DatabaseOutlined from '@ant-design/icons-vue/DatabaseOutlined'
import DeploymentUnitOutlined from '@ant-design/icons-vue/DeploymentUnitOutlined'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import ExperimentOutlined from '@ant-design/icons-vue/ExperimentOutlined'
import ExportOutlined from '@ant-design/icons-vue/ExportOutlined'
import EyeOutlined from '@ant-design/icons-vue/EyeOutlined'
import FileDoneOutlined from '@ant-design/icons-vue/FileDoneOutlined'
import FileOutlined from '@ant-design/icons-vue/FileOutlined'
import FileProtectOutlined from '@ant-design/icons-vue/FileProtectOutlined'
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import FileTextOutlined from '@ant-design/icons-vue/FileTextOutlined'
import FolderOutlined from '@ant-design/icons-vue/FolderOutlined'
import FormOutlined from '@ant-design/icons-vue/FormOutlined'
import HistoryOutlined from '@ant-design/icons-vue/HistoryOutlined'
import HomeOutlined from '@ant-design/icons-vue/HomeOutlined'
import InteractionOutlined from '@ant-design/icons-vue/InteractionOutlined'
import LineChartOutlined from '@ant-design/icons-vue/LineChartOutlined'
import MailOutlined from '@ant-design/icons-vue/MailOutlined'
import MessageOutlined from '@ant-design/icons-vue/MessageOutlined'
import OrderedListOutlined from '@ant-design/icons-vue/OrderedListOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import QuestionCircleOutlined from '@ant-design/icons-vue/QuestionCircleOutlined'
import RobotOutlined from '@ant-design/icons-vue/RobotOutlined'
import ScanOutlined from '@ant-design/icons-vue/ScanOutlined'
import ScheduleOutlined from '@ant-design/icons-vue/ScheduleOutlined'
import SettingOutlined from '@ant-design/icons-vue/SettingOutlined'
import ShoppingCartOutlined from '@ant-design/icons-vue/ShoppingCartOutlined'
import SolutionOutlined from '@ant-design/icons-vue/SolutionOutlined'
import SoundOutlined from '@ant-design/icons-vue/SoundOutlined'
import StarOutlined from '@ant-design/icons-vue/StarOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import ToolOutlined from '@ant-design/icons-vue/ToolOutlined'
import TrophyOutlined from '@ant-design/icons-vue/TrophyOutlined'
import UnorderedListOutlined from '@ant-design/icons-vue/UnorderedListOutlined'
import UserAddOutlined from '@ant-design/icons-vue/UserAddOutlined'
import UserOutlined from '@ant-design/icons-vue/UserOutlined'
import WarningOutlined from '@ant-design/icons-vue/WarningOutlined'
import { computed } from 'vue'

const props = defineProps<{ icon?: string }>()

const ICON_COMPONENTS: Record<string, Component> = {
  ApartmentOutlined,
  AppstoreOutlined,
  AreaChartOutlined,
  AuditOutlined,
  BarChartOutlined,
  BellOutlined,
  BookOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  CloudOutlined,
  CloudUploadOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  EditOutlined,
  ExperimentOutlined,
  ExportOutlined,
  EyeOutlined,
  FileDoneOutlined,
  FileOutlined,
  FileProtectOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  FolderOutlined,
  FormOutlined,
  HistoryOutlined,
  HomeOutlined,
  InteractionOutlined,
  LineChartOutlined,
  MailOutlined,
  MessageOutlined,
  OrderedListOutlined,
  PlusOutlined,
  ProfileOutlined,
  QuestionCircleOutlined,
  RobotOutlined,
  ScanOutlined,
  ScheduleOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  SolutionOutlined,
  SoundOutlined,
  StarOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  TrophyOutlined,
  UnorderedListOutlined,
  UserAddOutlined,
  UserOutlined,
  WarningOutlined,
}

// 菜单图标集合来自路由配置；新增图标时同步补充映射即可。
const ICON_ALIASES: Record<string, string> = {
  'user-group': 'TeamOutlined',
  "apps": 'AppstoreOutlined',
  "list": 'UnorderedListOutlined',
  "IconBarChart": 'BarChartOutlined',
  "IconCloud": 'CloudOutlined',
  "IconFile": 'FileOutlined',
  "IconList": 'UnorderedListOutlined',
  "IconStar": 'StarOutlined',
  "settings": 'SettingOutlined',
  "setting": 'SettingOutlined',
  "notification": 'BellOutlined',
}

/**
 * kebab-case 转 PascalCase
 * 例: 'file-search' → 'FileSearch', 'dashboard' → 'Dashboard'
 */
function toPascalCase(str: string): string {
  return str
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

const iconComponent = computed(() => {
  if (!props.icon) return undefined

  // 1. 特殊别名映射（名称与 Antd 组件名不对应的）
  if (ICON_ALIASES[props.icon]) {
    return ICON_COMPONENTS[ICON_ALIASES[props.icon]]
  }

  // 2. 已经是完整 Antd 组件名（如 'DashboardOutlined'）
  if (ICON_COMPONENTS[props.icon]) {
    return ICON_COMPONENTS[props.icon]
  }

  // 3. icon-xxx 格式 → XxxOutlined
  let name = props.icon
  if (name.startsWith('icon-')) {
    name = toPascalCase(name.replace('icon-', '')) + 'Outlined'
  } else if (name.startsWith('Icon') && name.length > 4) {
    // PascalCase 'IconXxx' 格式 → XxxOutlined
    name = name.slice(4) + 'Outlined'
  } else if (!name.endsWith('Outlined') && !name.endsWith('Filled') && !name.endsWith('TwoTone')) {
    // bare kebab-case → PascalCase + Outlined
    name = toPascalCase(name) + 'Outlined'
  }

  return ICON_COMPONENTS[name]
})
</script>

<template>
  <component :is="iconComponent" v-if="iconComponent" />
</template>
