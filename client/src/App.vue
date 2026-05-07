<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <h1>信息批量获取</h1>
      <div class="header-actions">
        <CookieManager :cookie-count="cookieCount" :is-logged-in="isLoggedIn" @refresh="checkLogin" />
        <HeadersManager @refresh="checkLogin" />
      </div>
    </el-header>
    <el-main>
      <UrlInput :loading="loading" :progress="progress" @fetch="handleFetch" @clear="handleClear" />
      <ResultTable ref="resultTable" :results="results" @delete="handleDelete" />
    </el-main>
  </el-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getLoginStatus, parseUrlsStream } from './api'
import CookieManager from './components/CookieManager.vue'
import UrlInput from './components/UrlInput.vue'
import ResultTable from './components/ResultTable.vue'
import HeadersManager from './components/HeadersManager.vue'

const isLoggedIn = ref(false)
const cookieCount = ref(0)
const loading = ref(false)
const results = ref([])
const progress = ref({ total: 0, completed: 0, pending: 0 })

async function checkLogin() {
  try {
    const data = await getLoginStatus()
    isLoggedIn.value = data.isLoggedIn
    cookieCount.value = data.cookieCount
  } catch {
    isLoggedIn.value = false
    cookieCount.value = 0
  }
}

async function handleFetch(urls) {
  loading.value = true
  results.value = []
  progress.value = { total: urls.length, completed: 0, pending: urls.length }
  try {
    const data = await parseUrlsStream(urls, (p) => {
      progress.value = { total: p.total, completed: p.completed, pending: p.pending }
      results.value.push(p.result)
    })
    if (data) results.value = data
  } catch (err) {
    results.value = [{ success: false, error: err.message }]
  } finally {
    loading.value = false
  }
}

function handleClear() {
  results.value = []
}

function handleDelete(index) {
  results.value.splice(index, 1)
}

onMounted(checkLogin)
</script>

<style lang="scss" scoped>
.app-container {
  max-width: 1700px;
  margin: 0 auto;
  padding: 24px;
  min-height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px !important;
  margin-bottom: 10px;
  height: auto !important;

  h1 {
    font-size: 24px;
    color: var(--primary-color);
    margin: 0;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
