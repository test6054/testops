<script setup lang="ts">
import type { Component } from 'vue'
import AimOutlined from '@ant-design/icons-vue/AimOutlined'
import AlertOutlined from '@ant-design/icons-vue/AlertOutlined'
import ApartmentOutlined from '@ant-design/icons-vue/ApartmentOutlined'
import ApiOutlined from '@ant-design/icons-vue/ApiOutlined'
import AppstoreOutlined from '@ant-design/icons-vue/AppstoreOutlined'
import AreaChartOutlined from '@ant-design/icons-vue/AreaChartOutlined'
import AuditOutlined from '@ant-design/icons-vue/AuditOutlined'
import BankOutlined from '@ant-design/icons-vue/BankOutlined'
import BarChartOutlined from '@ant-design/icons-vue/BarChartOutlined'
import BellOutlined from '@ant-design/icons-vue/BellOutlined'
import BlockOutlined from '@ant-design/icons-vue/BlockOutlined'
import BookOutlined from '@ant-design/icons-vue/BookOutlined'
import BranchesOutlined from '@ant-design/icons-vue/BranchesOutlined'
import BulbOutlined from '@ant-design/icons-vue/BulbOutlined'
import CalculatorOutlined from '@ant-design/icons-vue/CalculatorOutlined'
import CalendarOutlined from '@ant-design/icons-vue/CalendarOutlined'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import CheckSquareOutlined from '@ant-design/icons-vue/CheckSquareOutlined'
import CloudDownloadOutlined from '@ant-design/icons-vue/CloudDownloadOutlined'
import CloudOutlined from '@ant-design/icons-vue/CloudOutlined'
import CloudUploadOutlined from '@ant-design/icons-vue/CloudUploadOutlined'
import ClusterOutlined from '@ant-design/icons-vue/ClusterOutlined'
import ContainerOutlined from '@ant-design/icons-vue/ContainerOutlined'
import ControlOutlined from '@ant-design/icons-vue/ControlOutlined'
import CrownOutlined from '@ant-design/icons-vue/CrownOutlined'
import DashboardOutlined from '@ant-design/icons-vue/DashboardOutlined'
import DatabaseOutlined from '@ant-design/icons-vue/DatabaseOutlined'
import DeploymentUnitOutlined from '@ant-design/icons-vue/DeploymentUnitOutlined'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import ExceptionOutlined from '@ant-design/icons-vue/ExceptionOutlined'
import ExperimentOutlined from '@ant-design/icons-vue/ExperimentOutlined'
import ExportOutlined from '@ant-design/icons-vue/ExportOutlined'
import EyeOutlined from '@ant-design/icons-vue/EyeOutlined'
import FileDoneOutlined from '@ant-design/icons-vue/FileDoneOutlined'
import FileOutlined from '@ant-design/icons-vue/FileOutlined'
import FilePdfOutlined from '@ant-design/icons-vue/FilePdfOutlined'
import FileProtectOutlined from '@ant-design/icons-vue/FileProtectOutlined'
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import FileTextOutlined from '@ant-design/icons-vue/FileTextOutlined'
import FolderOpenOutlined from '@ant-design/icons-vue/FolderOpenOutlined'
import FolderOutlined from '@ant-design/icons-vue/FolderOutlined'
import FormOutlined from '@ant-design/icons-vue/FormOutlined'
import FunctionOutlined from '@ant-design/icons-vue/FunctionOutlined'
import HighlightOutlined from '@ant-design/icons-vue/HighlightOutlined'
import HistoryOutlined from '@ant-design/icons-vue/HistoryOutlined'
import HomeOutlined from '@ant-design/icons-vue/HomeOutlined'
import InboxOutlined from '@ant-design/icons-vue/InboxOutlined'
import InteractionOutlined from '@ant-design/icons-vue/InteractionOutlined'
import LayoutOutlined from '@ant-design/icons-vue/LayoutOutlined'
import LikeOutlined from '@ant-design/icons-vue/LikeOutlined'
import LineChartOutlined from '@ant-design/icons-vue/LineChartOutlined'
import LinkOutlined from '@ant-design/icons-vue/LinkOutlined'
import MailOutlined from '@ant-design/icons-vue/MailOutlined'
import MessageOutlined from '@ant-design/icons-vue/MessageOutlined'
import NodeIndexOutlined from '@ant-design/icons-vue/NodeIndexOutlined'
import OrderedListOutlined from '@ant-design/icons-vue/OrderedListOutlined'
import PayCircleOutlined from '@ant-design/icons-vue/PayCircleOutlined'
import PieChartOutlined from '@ant-design/icons-vue/PieChartOutlined'
import PlayCircleOutlined from '@ant-design/icons-vue/PlayCircleOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import PrinterOutlined from '@ant-design/icons-vue/PrinterOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import QuestionCircleOutlined from '@ant-design/icons-vue/QuestionCircleOutlined'
import RadarChartOutlined from '@ant-design/icons-vue/RadarChartOutlined'
import ReadOutlined from '@ant-design/icons-vue/ReadOutlined'
import ReconciliationOutlined from '@ant-design/icons-vue/ReconciliationOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import RiseOutlined from '@ant-design/icons-vue/RiseOutlined'
import RobotOutlined from '@ant-design/icons-vue/RobotOutlined'
import RocketOutlined from '@ant-design/icons-vue/RocketOutlined'
import SafetyCertificateOutlined from '@ant-design/icons-vue/SafetyCertificateOutlined'
import SafetyOutlined from '@ant-design/icons-vue/SafetyOutlined'
import ScanOutlined from '@ant-design/icons-vue/ScanOutlined'
import ScheduleOutlined from '@ant-design/icons-vue/ScheduleOutlined'
import SearchOutlined from '@ant-design/icons-vue/SearchOutlined'
import SettingOutlined from '@ant-design/icons-vue/SettingOutlined'
import ShoppingCartOutlined from '@ant-design/icons-vue/ShoppingCartOutlined'
import SolutionOutlined from '@ant-design/icons-vue/SolutionOutlined'
import SoundOutlined from '@ant-design/icons-vue/SoundOutlined'
import StarOutlined from '@ant-design/icons-vue/StarOutlined'
import SwapOutlined from '@ant-design/icons-vue/SwapOutlined'
import TableOutlined from '@ant-design/icons-vue/TableOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import ToolOutlined from '@ant-design/icons-vue/ToolOutlined'
import TrophyOutlined from '@ant-design/icons-vue/TrophyOutlined'
import UnorderedListOutlined from '@ant-design/icons-vue/UnorderedListOutlined'
import UserAddOutlined from '@ant-design/icons-vue/UserAddOutlined'
import UserDeleteOutlined from '@ant-design/icons-vue/UserDeleteOutlined'
import UserOutlined from '@ant-design/icons-vue/UserOutlined'
import WarningOutlined from '@ant-design/icons-vue/WarningOutlined'
import { computed } from 'vue'

const props = defineProps<{ icon?: string }>()

const ICON_COMPONENTS: Record<string, Component> = {
  AimOutlined,
  AlertOutlined,
  ApartmentOutlined,
  ApiOutlined,
  AppstoreOutlined,
  AreaChartOutlined,
  AuditOutlined,
  BankOutlined,
  BarChartOutlined,
  BellOutlined,
  BranchesOutlined,
  BlockOutlined,
  BookOutlined,
  BulbOutlined,
  CalculatorOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  CloudDownloadOutlined,
  CloudOutlined,
  CloudUploadOutlined,
  ClusterOutlined,
  ContainerOutlined,
  ControlOutlined,
  CrownOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  EditOutlined,
  ExceptionOutlined,
  ExperimentOutlined,
  ExportOutlined,
  EyeOutlined,
  FileDoneOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileProtectOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  FormOutlined,
  FunctionOutlined,
  HighlightOutlined,
  HistoryOutlined,
  HomeOutlined,
  InboxOutlined,
  InteractionOutlined,
  LayoutOutlined,
  LikeOutlined,
  LineChartOutlined,
  LinkOutlined,
  MailOutlined,
  MessageOutlined,
  NodeIndexOutlined,
  OrderedListOutlined,
  PayCircleOutlined,
  PieChartOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  PrinterOutlined,
  ProfileOutlined,
  QuestionCircleOutlined,
  RadarChartOutlined,
  ReadOutlined,
  RocketOutlined,
  ReconciliationOutlined,
  ReloadOutlined,
  RiseOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SafetyOutlined,
  ScanOutlined,
  ScheduleOutlined,
  SearchOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  SolutionOutlined,
  SoundOutlined,
  StarOutlined,
  SwapOutlined,
  TableOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  TrophyOutlined,
  UnorderedListOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
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
  "bookmark": 'BookOutlined',
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
