<template>
  <div class="headers-manager">
    <el-button @click="openDialog">请求配置</el-button>

    <el-dialog v-model="dialogVisible" title="请求 Headers 配置" width="600px">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="导入 curl" name="curl">
          <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px;">
            从浏览器 DevTools → Network → 右键请求 → Copy as cURL，粘贴到下方
          </el-alert>
          <el-input
            v-model="curlInput"
            type="textarea"
            :rows="6"
            placeholder="粘贴 curl 命令..."
          />
          <div class="curl-actions">
            <el-button
              type="primary"
              :loading="importing"
              @click="handleImportCurl"
            >
              导入
            </el-button>
          </div>
        </el-tab-pane>

        <el-tab-pane label="手动编辑" name="edit">
          <div
            v-for="(value, key) in headers"
            :key="key"
            class="header-item"
          >
            <label class="header-key">{{ key }}</label>
            <el-input v-model="headers[key]" size="small" :placeholder="key" />
          </div>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="handleReset" plain>重置默认</el-button>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import {
  ref
} from 'vue'
import {
  ElMessage
} from 'element-plus'
import {
  getHeaders,
  updateHeaders,
  resetHeaders,
  importCurl
} from '../api'

const emit = defineEmits(['refresh'])

const dialogVisible = ref(false)
const saving = ref(false)
const importing = ref(false)
const activeTab = ref('curl')
const curlInput = ref('')
const headers = ref({})

async function loadHeaders() {
  try {
    const data = await getHeaders()
    headers.value = data.headers || {}
  } catch {
    headers.value = {}
  }
}

function openDialog() {
  dialogVisible.value = true
  curlInput.value = ''
  activeTab.value = 'curl'
  loadHeaders()
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
      let msg = data.message
      if (data.cookieImported) {
        msg += '，Cookie 已同步导入'
        emit('refresh')
      }
      ElMessage.success(msg)
      await loadHeaders()
      curlInput.value = ''
      activeTab.value = 'edit'
    }
  } catch (err) {
    ElMessage.error(err.message)
  } finally {
    importing.value = false
  }
}

async function handleSave() {
  saving.value = true
  try {
    const data = await updateHeaders(headers.value)
    ElMessage.success(data.message)
    dialogVisible.value = false
  } catch (err) {
    ElMessage.error(err.message)
  } finally {
    saving.value = false
  }
}

async function handleReset() {
  try {
    const data = await resetHeaders()
    headers.value = data.headers
    ElMessage.success(data.message)
  } catch (err) {
    ElMessage.error(err.message)
  }
}
</script>

<style lang="scss" scoped>
.headers-manager {
  display: flex;
  align-items: center;
}

.curl-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.header-item {
  margin-bottom: 12px;

  .header-key {
    display: block;
    font-size: 12px;
    color: #888;
    margin-bottom: 4px;
    font-family: monospace;
  }
}
</style>
