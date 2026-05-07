<template>
  <el-card class="url-input-card" shadow="hover">
    <el-input
      v-model="urlText"
      type="textarea"
      :rows="5"
      placeholder="输入链接（每行一个，支持多种格式）&#10;https://www.xxx.com/explore/xxxx&#10;https://xxx.com/xxxx&#10;https://www.xxx.com/discovery/item/xxxx"
      class="url-textarea"
    />
    <div class="btn-row">
      <el-button
        class="fetch-btn"
        :loading="loading"
        @click="handleFetch"
      >
        获取信息
      </el-button>
      <el-button
        plain
        @click="handleImportCSV"
      >
        导入 CSV
      </el-button>
      <el-button
        plain
        @click="downloadTemplate"
      >
        下载模板
      </el-button>
      <el-button
        plain
        @click="handleClear"
      >
        清空
      </el-button>
      <span
        v-if="statusText"
        class="status-text"
      >
        {{ statusText }}
      </span>
    </div>
    <input ref="fileInput" type="file" accept=".csv" style="display: none" @change="onFileChange" />
    <el-progress
      v-if="loading"
      :percentage="100"
      :indeterminate="true"
      :duration="2"
      :color="'#ff2442'"
      style="margin-top: 16px;"
    />
  </el-card>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  loading: Boolean,
})

watch(() => props.loading, (val, oldVal) => {
  if (oldVal && !val) {
    statusText.value = ''
  }
})

const emit = defineEmits(['fetch', 'clear'])

const urlText = ref('')
const statusText = ref('')
const fileInput = ref(null)

function handleFetch() {
  const raw = urlText.value.trim()
  if (!raw) return ElMessage.warning('请输入至少一个链接')

  const urls = raw.split('\n').map(s => s.trim()).filter(Boolean)
  if (urls.length === 0) return ElMessage.warning('请输入至少一个链接')

  statusText.value = `准备获取 ${urls.length} 条笔记...`
  emit('fetch', urls)
}

function handleClear() {
  urlText.value = ''
  statusText.value = ''
  emit('clear')
}

function handleImportCSV() {
  fileInput.value.click()
}

function onFileChange(e) {
  const file = e.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    const text = event.target.result
    const lines = text.split('\n')
    const urls = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      // Skip header row
      if (i === 0 && (line.toLowerCase().includes('url') || line.toLowerCase().includes('链接'))) continue
      // Support CSV with comma separation - take first column
      const url = line.split(',')[0].trim().replace(/^"|"$/g, '')
      if (url) urls.push(url)
    }
    if (urls.length === 0) {
      ElMessage.warning('CSV 中未找到有效链接')
    } else {
      urlText.value = urls.join('\n')
      ElMessage.success(`已导入 ${urls.length} 条链接`)
    }
  }
  reader.readAsText(file)
  // Reset input so same file can be imported again
  e.target.value = ''
}

function downloadTemplate() {
  const csv = '链接\nhttps://www.xxxx.com/explore/xxxx\nhttps://xxxx.com/xxxx'
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = '导入模板.csv'
  a.click()
}
</script>

<style lang="scss" scoped>
.url-input-card {
  margin-bottom: 24px;
  border-radius: 12px;
  border: none;

  :deep(.el-card__body) {
    padding: 28px;
  }
}

.url-textarea {
  :deep(.el-textarea__inner) {
    border-radius: 8px;
    font-size: 14px;
    line-height: 1.6;
    padding: 12px 16px;
    resize: vertical;

    &:focus {
      border-color: #ff2442;
      box-shadow: 0 0 0 2px rgba(255, 36, 66, 0.1);
    }
  }
}

.btn-row {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.fetch-btn {
  background: #ff2442;
  border-color: #ff2442;
  color: #fff;

  &:hover,
  &:focus {
    background: #e6203c;
    border-color: #e6203c;
    color: #fff;
  }

  &:active {
    background: #cc1c35;
    border-color: #cc1c35;
  }
}

.status-text {
  font-size: 13px;
  color: #999;
  margin-left: 4px;
}
</style>
