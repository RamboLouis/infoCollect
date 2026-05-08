<template>
  <div class="cookie-manager">
    <el-tag
      :type="isLoggedIn ? 'success' : 'warning'"
      size="large">
      {{
        isLoggedIn
        ? `已登录 (${cookieCount} 条 Cookie)`
        : '未登录'
      }}
    </el-tag>
    <el-button type="primary" @click="openDialog">管理 Cookie</el-button>
    <el-dialog
      v-model="dialogVisible"
      title="Cookie 管理"
      width="900px"
    >
      <div class="import-section">
        <el-input
          v-model="cookieInput"
          type="textarea"
          :rows="8"
          placeholder="每次只粘贴一条 Cookie 字符串"
          clearable
        />
        <div class="import-actions">
          <el-button type="primary" :loading="importing" @click="handleImport">导入</el-button>
        </div>
      </div>

      <div class="cookie-list-header">
        <span>已保存的 Cookie（{{ cookies.length }} 条）</span>
        <el-button
          v-if="cookies.length > 0"
          type="danger"
          plain
          size="small"
          @click="handleClearAll"
        >
          清空全部
        </el-button>
      </div>

      <el-table :data="paginatedCookies" stripe style="width: 100%" max-height="300">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column label="Cookie" min-width="200">
          <template #default="{ row }">
            <el-tooltip :content="getCookieValue(row)" placement="top" :show-after="300">
              <span class="cookie-text">{{ maskCookie(getCookieValue(row)) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="添加时间" min-width="160" align="center">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center">
          <template #default="{ $index }">
            <el-button type="danger" plain size="small" @click="handleDelete($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="cookies.length === 0" class="empty">
        暂无 Cookie
      </div>
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="cookies.length"
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
  getCookies,
  importCookies,
  deleteCookie,
  clearCookies
} from '../api'

defineProps({
  isLoggedIn: Boolean,
  cookieCount: Number,
})

const emit = defineEmits(['refresh'])

const dialogVisible = ref(false)
const cookieInput = ref('')
const importing = ref(false)
const cookies = ref([])
const confirmVisible = ref(false)
const confirmMessage = ref('')
const confirmLoading = ref(false)
let pendingAction = null

const currentPage = ref(1)
const pageSize = ref(10)

const paginatedCookies = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return cookies.value.slice(start, start + pageSize.value)
})

function getCookieValue(item) {
  return typeof item === 'string' ? item : item.value || ''
}

function maskCookie(str) {
  if (!str || str.length <= 40) return str
  return str.slice(0, 20) + ' ... ' + str.slice(-15)
}

function formatTime(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function loadCookies() {
  try {
    const data = await getCookies()
    cookies.value = data.cookies || []
  } catch {
    cookies.value = []
  }
}

function openDialog() {
  dialogVisible.value = true
  loadCookies()
}

async function handleImport() {
  const input = cookieInput.value.trim()
  if (!input) return ElMessage.warning('请输入 Cookie')

  importing.value = true
  try {
    const data = await importCookies(input)
    if (data.error) {
      ElMessage.error(data.error)
    } else {
      ElMessage.success(data.message)
      cookieInput.value = ''
      loadCookies()
      emit('refresh')
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
  showConfirm('确定删除该 Cookie？', async () => {
    const data = await deleteCookie(index)
    ElMessage.success(data.message)
    loadCookies()
    emit('refresh')
  })
}

function handleClearAll() {
  showConfirm('确定清空所有 Cookie？', async () => {
    const data = await clearCookies()
    ElMessage.success(data.message)
    loadCookies()
    emit('refresh')
  })
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
.cookie-manager {
  display: flex;
  align-items: center;
  gap: 12px;
}

.import-section {
  margin-bottom: 20px;

  .import-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
  }
}

.cookie-list-header {
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

.cookie-text {
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
