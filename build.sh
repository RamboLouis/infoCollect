#!/bin/bash
set -e

echo "=== 开始构建 ==="

# 构建前端
echo "构建前端..."
cd client && vite build && cd ..

# 创建打包目录
echo "打包文件..."
rm -rf deploy
mkdir -p deploy/server

npx javascript-obfuscator server/ --output deploy/server/ --compact true --self-defending false > /dev/null 2>&1

# 复制其他文件
cp -r dist/ deploy/
cp package.json deploy/
cp package-lock.json deploy/
cp ecosystem.config.js deploy/

# 压缩
rm -f info.zip
cd deploy && zip -r ../info.zip . && cd ..

# 清理
rm -rf deploy

echo "=== 构建完成 ==="
echo "生成文件: info.zip"
