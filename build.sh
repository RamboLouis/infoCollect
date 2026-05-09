#!/bin/bash
set -e

echo "=== 开始构建 ==="

# 构建前端
echo "构建前端..."
cd client && npx vite build && cd ..

# 创建打包目录
echo "打包文件..."
rm -rf deploy
mkdir -p deploy/server

npx javascript-obfuscator server/ --output deploy/server/ --compact true --self-defending false > /dev/null 2>&1

# 复制其他文件
cp -r dist/ deploy/dist/
cp package.json deploy/
cp package-lock.json deploy/
cp ecosystem.config.js deploy/

# 压缩
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_DIR="releases"
mkdir -p "$OUTPUT_DIR"
OUTPUT_FILE="${OUTPUT_DIR}/info_${TIMESTAMP}.zip"
cd deploy && zip -r "../${OUTPUT_FILE}" . && cd ..

# 清理
rm -rf deploy

echo "=== 构建完成 ==="
echo "生成文件: ${OUTPUT_FILE}"
