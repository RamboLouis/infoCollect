<template>
  <div class="headers-manager">
    <el-button @click="openDialog">
      请求配置
    </el-button>
    <el-dialog
      v-model="dialogVisible"
      title="请求配置"
      width="900px"
    >
      <div class="site-config">
        <span class="site-label">站点标识</span>
        <el-input
          v-model="siteValue"
          :placeholder="siteDefault ? `默认: ${siteDefault}` : '如 xiaohongshu'"
          class="site-input"
        />
        <el-button
          type="primary"
          size="small"
          :loading="siteSaving"
          @click="handleSiteSave"
        >
          保存
        </el-button>
      </div>
      <el-divider />

      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px;">
        从浏览器 DevTools → Network → 右键请求 → Copy as cURL，粘贴到下方导入多套请求配置，每次请求会随机选取
      </el-alert>

      <div class="import-section">
        <el-input
          v-model="curlInput"
          type="textarea"
          :rows="6"
          placeholder="粘贴 curl 命令..."
        />
        <div class="import-actions">
          <el-button
            type="primary"
            :loading="importing"
            @click="handleImportCurl"
          >
            导入
          </el-button>
        </div>
      </div>

      <div class="headers-list-header">
        <span>已保存的配置（{{ headers.length }} 套）</span>
        <div>
          <el-button
            v-if="headers.length > 0"
            type="danger"
            plain
            size="small"
            @click="handleClearAll"
          >
            清空全部
          </el-button>
          <el-button
            plain
            size="small"
            @click="handleReset"
          >
            重置默认
          </el-button>
        </div>
      </div>

      <el-table :data="paginatedHeaders" stripe style="width: 100%" max-height="300">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column label="User-Agent" min-width="200">
          <template #default="{ row }">
            <el-tooltip :content="row.value['user-agent'] || '-'" placement="top" :show-after="300">
              <span class="ua-text">{{ maskUA(row.value['user-agent']) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="添加时间" min-width="160" align="center">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ $index }">
            <el-button type="danger" plain size="small" @click="handleDelete($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="headers.length === 0" class="empty">
        暂无配置，将使用默认请求头
      </div>

      <div v-if="headers.length > pageSize" class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="headers.length"
          layout="total, sizes, prev, pager, next"
          small
        />
      </div>
    </el-dialog>

    <el-dialog
      v-model="confirmVisible"
      title="确认操作"
      width="400px"
      append-to-body
    >
      <span>{{ confirmMessage }}</span>
      <template #footer>
        <el-button @click="confirmVisible = false">取消</el-button>
        <el-button type="danger" :loading="confirmLoading" @click="confirmAction">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getHeaders,
  resetHeaders,
  deleteHeaders,
  clearHeaders,
  importCurl,
  getSiteConfig,
  updateSiteConfig
} from '../api'

const emit = defineEmits(['refresh'])

const dialogVisible = ref(false)
const importing = ref(false)
const curlInput = ref('')
const headers = ref([])
const siteValue = ref('')
const siteDefault = ref('')
const siteSaving = ref(false)
const confirmVisible = ref(false)
const confirmMessage = ref('')
const confirmLoading = ref(false)
let pendingAction = null

const currentPage = ref(1)
const pageSize = ref(10)

const paginatedHeaders = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return headers.value.slice(start, start + pageSize.value)
})

function maskUA(str) {
  if (!str) return '-'
  if (str.length <= 60) return str
  return str.slice(0, 30) + ' ... ' + str.slice(-25)
}

function formatTime(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function loadHeadersList() {
  try {
    const data = await getHeaders()
    headers.value = data.headers || []
  } catch {
    headers.value = []
  }
}

async function loadSite() {
  try {
    const data = await getSiteConfig()
    siteValue.value = data.site || ''
    siteDefault.value = data.default || ''
  } catch {
    siteValue.value = ''
  }
}

function openDialog() {
  dialogVisible.value = true
  curlInput.value = ''
  loadHeadersList()
  loadSite()
}

async function handleSiteSave() {
  if (!siteValue.value.trim()) return ElMessage.warning('请输入站点标识')
  siteSaving.value = true
  try {
    const data = await updateSiteConfig(siteValue.value.trim())
    ElMessage.success(data.message)
  } catch (err) {
    ElMessage.error(err.message)
  } finally {
    siteSaving.value = false
  }
}

async function handleImportCurl() {
  const input = curlInput.value.trim()
  if (!input) return ElMessage.warning('请粘贴 curl 命令')

  importing.value = true
  try {
    const data = await importCurl(input)
    if (data.error) {
      ElMessage.error(data.error)
    } else {
      let msg = data.message || '导入成功'
      if (data.cookieImported) {
        msg += '，Cookie 已同步导入'
        emit('refresh')
      }
      ElMessage.success(msg)
      await loadHeadersList()
      curlInput.value = ''
    }
  } catch (err) {
    ElMessage.error(err.message)
  } finally {
    importing.value = false
  }
}

function showConfirm(message, action) {
  confirmMessage.value = message
  pendingAction = action
  confirmVisible.value = true
}

function handleDelete(index) {
  const globalIndex = (currentPage.value - 1) * pageSize.value + index
  showConfirm('确定删除该配置？', async () => {
    const data = await deleteHeaders(globalIndex)
    ElMessage.success(data.message)
    loadHeadersList()
  })
}

function handleClearAll() {
  showConfirm('确定清空所有 Headers 配置？', async () => {
    const data = await clearHeaders()
    ElMessage.success(data.message)
    loadHeadersList()
  })
}

async function handleReset() {
  try {
    const data = await resetHeaders()
    ElMessage.success(data.message)
    await loadHeadersList()
  } catch (err) {
    ElMessage.error(err.message)
  }
}

async function confirmAction() {
  confirmLoading.value = true
  try {
    await pendingAction()
    confirmVisible.value = false
  } catch (err) {
    ElMessage.error(err.message)
  } finally {
    confirmLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.headers-manager {
  display: flex;
  align-items: center;
}

.site-config {
  display: flex;
  align-items: center;
  gap: 12px;

  .site-label {
    font-size: 13px;
    color: #666;
    white-space: nowrap;
  }

  .site-input {
    flex: 1;
  }
}

.import-section {
  margin-bottom: 20px;

  .import-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
  }
}

.headers-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.empty {
  text-align: center;
  padding: 24px;
  color: #bbb;
  font-size: 14px;
}

.ua-text {
  font-family: monospace;
  font-size: 13px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  max-width: 100%;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
