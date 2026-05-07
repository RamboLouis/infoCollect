<template>
  <el-card class="result-card" shadow="never">
    <template #header>
      <div class="result-header">
        <h3>结果列表</h3>
        <el-button v-if="results.length > 0" @click="exportCSV">
          导出 CSV
        </el-button>
      </div>
      <el-row v-if="results.length > 0" class="filter-row" :gutter="12" align="middle">
        <el-col :span="4">
          <div class="filter-item">
            <span class="filter-label">作者:</span>
            <el-input
              v-model="filterAuthor"
              placeholder="请输入作者"
              clearable
            />
          </div>
        </el-col>
        <el-col :span="6">
          <div class="filter-item">
            <span class="filter-label">发布时间:</span>
            <el-date-picker
              v-model="filterDateRange"
              type="daterange"
              range-separator="~"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </div>
        </el-col>
        <el-col :span="14" style="text-align: right;">
          <el-button @click="resetFilters">重置</el-button>
        </el-col>
      </el-row>
    </template>

    <el-table :data="pagedData" stripe style="width: 100%" empty-text="粘贴链接后点击「获取信息」">
      <el-table-column type="index" label="序号" width="55" />
      <el-table-column label="类型" width="70">
        <template #default="{ row }">
          <el-tag :type="row.type === '视频' ? 'danger' : 'primary'" size="small">
            {{ row.type }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="标题" min-width="200">
        <template #default="{ row }">
          <a v-if="row.url" :href="row.url" target="_blank" rel="noopener" class="title-link">
            {{ row.title }}
          </a>
          <span v-else>{{ row.title }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="author" label="作者" width="150" />
      <el-table-column prop="likedCount" label="点赞" width="100" align="right" />
      <el-table-column prop="collectedCount" label="收藏" width="100" align="right" />
      <el-table-column prop="commentCount" label="评论" width="100" align="right" />
      <el-table-column prop="shareCount" label="分享" width="100" align="right" />
      <el-table-column prop="time" label="发布时间" width="160" />
      <el-table-column prop="lastUpdateTime" label="更新时间" width="160" />
      <el-table-column label="错误" min-width="50">
        <template #default="{ row }">
          <span v-if="row.error" class="error-text">{{ row.error }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="100" fixed="right">
        <template #default="{ row }">
          <el-button type="danger" plain size="small" @click="handleDelete(row._index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      class="pagination"
      background
      layout="total, sizes, prev, pager, next"
      :total="tableData.length"
      :current-page="currentPage"
      :page-size="pageSize"
      :page-sizes="[10, 20, 50]"
      @current-change="handlePageChange"
      @size-change="handleSizeChange"
    />
  </el-card>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  results: { type: Array, default: () => [] },
})

const emit = defineEmits(['delete'])

const filterAuthor = ref('')
const filterDateRange = ref(null)
const currentPage = ref(1)
const pageSize = ref(10)

function handleDelete(index) {
  emit('delete', index)
}

function resetFilters() {
  filterAuthor.value = ''
  filterDateRange.value = null
}

watch([filterAuthor, filterDateRange], () => {
  currentPage.value = 1
})

const filteredResults = computed(() => {
  return props.results.filter((item) => {
    if (!item.success) return true
    const d = item.data

    if (filterAuthor.value && !d.author?.toLowerCase().includes(filterAuthor.value.toLowerCase())) {
      return false
    }

    if (filterDateRange.value && filterDateRange.value.length === 2 && d.time) {
      const dateStr = d.time.split(' ')[0].replace(/\//g, '-')
      const [start, end] = filterDateRange.value
      if (dateStr < start || dateStr > end) return false
    }

    return true
  })
})

const tableData = computed(() => {
  return filteredResults.value.map((item, i) => {
    if (item.success) {
      return { ...item.data, _index: props.results.indexOf(item) }
    }
    return {
      title: item.url || '',
      url: item.url || '',
      error: item.error,
      _index: props.results.indexOf(item),
    }
  })
})

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return tableData.value.slice(start, start + pageSize.value)
})

function handlePageChange(page) {
  currentPage.value = page
}

function handleSizeChange(size) {
  pageSize.value = size
  currentPage.value = 1
}

function exportCSV() {
  const rows = [['序号', '类型', '标题', '作者', '点赞', '收藏', '评论', '分享', '发布时间', '更新时间', '链接']]
  props.results.forEach((item, i) => {
    if (item.success) {
      const d = item.data
      rows.push([i + 1, d.type, d.title, d.author, d.likedCount, d.collectedCount, d.commentCount, d.shareCount, d.time, d.lastUpdateTime, d.url])
    }
  })

  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `信息数据_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
}
</script>

<style lang="scss" scoped>
.result-card {
  border-radius: 12px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-row {
  margin-top: 12px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
}

.title-link {
  color: #333;
  text-decoration: none;

  &:hover {
    color: var(--primary-color);
    text-decoration: underline;
  }
}

.error-text {
  color: #dc2626;
}

.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
