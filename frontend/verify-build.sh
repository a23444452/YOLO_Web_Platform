#!/bin/bash

# YOLO Web 平台 - 構建驗證腳本
# 此腳本會檢查構建是否成功並驗證關鍵檔案

set -e

echo "======================================"
echo "YOLO Web 平台 - 構建驗證"
echo "======================================"
echo ""

# 1. 檢查 Node.js 和 npm
echo "📦 檢查環境..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安裝"
    exit 1
fi
echo "✅ Node.js: $(node -v)"

if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安裝"
    exit 1
fi
echo "✅ npm: $(npm -v)"
echo ""

# 2. 檢查依賴
echo "📚 檢查依賴..."
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules 不存在,正在安裝依賴..."
    npm install
else
    echo "✅ node_modules 存在"
fi
echo ""

# 3. TypeScript 類型檢查
echo "🔍 TypeScript 類型檢查..."
if npm run type-check 2>/dev/null; then
    echo "✅ TypeScript 類型檢查通過"
else
    if npx tsc --noEmit; then
        echo "✅ TypeScript 類型檢查通過"
    else
        echo "❌ TypeScript 類型檢查失敗"
        exit 1
    fi
fi
echo ""

# 4. 構建專案
echo "🔨 構建專案..."
if npm run build; then
    echo "✅ 構建成功"
else
    echo "❌ 構建失敗"
    exit 1
fi
echo ""

# 5. 檢查構建產物
echo "📦 檢查構建產物..."
if [ ! -d "dist" ]; then
    echo "❌ dist 目錄不存在"
    exit 1
fi
echo "✅ dist 目錄存在"

if [ ! -f "dist/index.html" ]; then
    echo "❌ dist/index.html 不存在"
    exit 1
fi
echo "✅ dist/index.html 存在"

# 檢查 JS 和 CSS 檔案
js_files=$(find dist/assets -name "*.js" | wc -l)
css_files=$(find dist/assets -name "*.css" | wc -l)

if [ "$js_files" -eq 0 ]; then
    echo "❌ 沒有找到 JS 檔案"
    exit 1
fi
echo "✅ 找到 $js_files 個 JS 檔案"

if [ "$css_files" -eq 0 ]; then
    echo "❌ 沒有找到 CSS 檔案"
    exit 1
fi
echo "✅ 找到 $css_files 個 CSS 檔案"
echo ""

# 6. 檢查關鍵原始碼檔案
echo "📝 檢查關鍵檔案..."
key_files=(
    "src/stores/annotationStore.ts"
    "src/components/annotation/AnnotationCanvas.tsx"
    "src/components/annotation/ImageUploadZone.tsx"
    "src/pages/Annotation.tsx"
)

for file in "${key_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ $file 不存在"
        exit 1
    fi
    echo "✅ $file"
done
echo ""

# 7. 檢查關鍵功能實作
echo "🔎 檢查關鍵功能..."

# 檢查資料夾上傳功能
if grep -q "webkitdirectory" src/components/annotation/ImageUploadZone.tsx; then
    echo "✅ 資料夾上傳功能已實作"
else
    echo "❌ 資料夾上傳功能未找到"
    exit 1
fi

# 檢查 YOLO 導出功能
if grep -q "exportAnnotations" src/stores/annotationStore.ts; then
    echo "✅ YOLO 導出功能已實作"
else
    echo "❌ YOLO 導出功能未找到"
    exit 1
fi

# 檢查 Canvas 編輯功能
if grep -q "getHandlePositions" src/components/annotation/AnnotationCanvas.tsx; then
    echo "✅ Canvas 編輯功能已實作"
else
    echo "❌ Canvas 編輯功能未找到"
    exit 1
fi

# 檢查 JSZip 依賴
if grep -q "jszip" package.json; then
    echo "✅ JSZip 依賴已安裝"
else
    echo "❌ JSZip 依賴未找到"
    exit 1
fi
echo ""

# 8. 統計資訊
echo "📊 專案統計..."
total_tsx=$(find src -name "*.tsx" | wc -l)
total_ts=$(find src -name "*.ts" | wc -l)
total_files=$((total_tsx + total_ts))
echo "TypeScript/TSX 檔案: $total_files ($total_tsx TSX, $total_ts TS)"

total_components=$(find src/components -name "*.tsx" 2>/dev/null | wc -l)
echo "React 組件: $total_components"

dist_size=$(du -sh dist 2>/dev/null | cut -f1)
echo "構建大小: $dist_size"
echo ""

# 9. 成功訊息
echo "======================================"
echo "✅ 所有檢查通過!"
echo "======================================"
echo ""
echo "🚀 可以啟動開發伺服器:"
echo "   npm run dev"
echo ""
echo "📦 或預覽生產構建:"
echo "   npm run preview"
echo ""
echo "🌐 開發伺服器 URL: http://localhost:5173"
echo ""
