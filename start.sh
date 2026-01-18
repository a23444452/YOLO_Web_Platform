#!/bin/bash

# YOLO Project - 自動化啟動腳本
# 同時啟動前端和後端服務

set -e  # 遇到錯誤立即退出

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 項目路徑
PROJECT_DIR="/Users/vincewang/YOLO-Project"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# 日誌檔案
LOG_DIR="$PROJECT_DIR/logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

# PID 檔案
PID_DIR="$PROJECT_DIR/.pids"
BACKEND_PID="$PID_DIR/backend.pid"
FRONTEND_PID="$PID_DIR/frontend.pid"

# 建立必要目錄
mkdir -p "$LOG_DIR"
mkdir -p "$PID_DIR"

# 顯示標題
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     YOLO Web Platform - 啟動腳本          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# 清理函數 - 在腳本退出時執行
cleanup() {
    echo ""
    echo -e "${YELLOW}正在關閉服務...${NC}"

    # 停止後端
    if [ -f "$BACKEND_PID" ]; then
        BACKEND_PROC=$(cat "$BACKEND_PID")
        if ps -p "$BACKEND_PROC" > /dev/null 2>&1; then
            echo -e "${YELLOW}停止後端服務 (PID: $BACKEND_PROC)${NC}"
            kill "$BACKEND_PROC" 2>/dev/null || true
        fi
        rm -f "$BACKEND_PID"
    fi

    # 停止前端
    if [ -f "$FRONTEND_PID" ]; then
        FRONTEND_PROC=$(cat "$FRONTEND_PID")
        if ps -p "$FRONTEND_PROC" > /dev/null 2>&1; then
            echo -e "${YELLOW}停止前端服務 (PID: $FRONTEND_PROC)${NC}"
            kill "$FRONTEND_PROC" 2>/dev/null || true
        fi
        rm -f "$FRONTEND_PID"
    fi

    echo -e "${GREEN}所有服務已停止${NC}"
}

# 註冊退出處理
trap cleanup EXIT INT TERM

# 檢查後端虛擬環境
echo -e "${BLUE}[1/4] 檢查後端環境...${NC}"
if [ ! -d "$BACKEND_DIR/venv" ]; then
    echo -e "${RED}錯誤: 後端虛擬環境不存在${NC}"
    echo -e "${YELLOW}請先執行: cd $BACKEND_DIR && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 後端環境檢查完成${NC}"

# 檢查前端依賴
echo -e "${BLUE}[2/4] 檢查前端環境...${NC}"
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${YELLOW}前端依賴未安裝，正在安裝...${NC}"
    cd "$FRONTEND_DIR"
    pnpm install || npm install
fi
echo -e "${GREEN}✓ 前端環境檢查完成${NC}"

# 啟動後端
echo -e "${BLUE}[3/4] 啟動後端服務...${NC}"
cd "$BACKEND_DIR"
source venv/bin/activate

# 啟動後端並記錄 PID
nohup python -m yolo_api.main > "$BACKEND_LOG" 2>&1 &
BACKEND_PROC=$!
echo "$BACKEND_PROC" > "$BACKEND_PID"

# 等待後端啟動
echo -e "${YELLOW}等待後端啟動...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 後端服務已啟動 (PID: $BACKEND_PROC)${NC}"
        echo -e "${GREEN}  URL: http://localhost:8000${NC}"
        echo -e "${GREEN}  API 文檔: http://localhost:8000/docs${NC}"
        break
    fi

    if [ $i -eq 30 ]; then
        echo -e "${RED}錯誤: 後端啟動超時${NC}"
        echo -e "${YELLOW}查看日誌: tail -f $BACKEND_LOG${NC}"
        exit 1
    fi

    sleep 1
done

# 啟動前端
echo -e "${BLUE}[4/4] 啟動前端服務...${NC}"
cd "$FRONTEND_DIR"

# 啟動前端並記錄 PID
nohup pnpm dev > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PROC=$!
echo "$FRONTEND_PROC" > "$FRONTEND_PID"

# 等待前端啟動
echo -e "${YELLOW}等待前端啟動...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 前端服務已啟動 (PID: $FRONTEND_PROC)${NC}"
        echo -e "${GREEN}  URL: http://localhost:5173${NC}"
        break
    fi

    if [ $i -eq 30 ]; then
        echo -e "${RED}錯誤: 前端啟動超時${NC}"
        echo -e "${YELLOW}查看日誌: tail -f $FRONTEND_LOG${NC}"
        exit 1
    fi

    sleep 1
done

# 啟動完成
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          所有服務啟動成功！                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}服務資訊:${NC}"
echo -e "  ${GREEN}前端:${NC} http://localhost:5173"
echo -e "  ${GREEN}後端:${NC} http://localhost:8000"
echo -e "  ${GREEN}API 文檔:${NC} http://localhost:8000/docs"
echo ""
echo -e "${BLUE}日誌檔案:${NC}"
echo -e "  ${YELLOW}後端:${NC} tail -f $BACKEND_LOG"
echo -e "  ${YELLOW}前端:${NC} tail -f $FRONTEND_LOG"
echo ""
echo -e "${BLUE}管理命令:${NC}"
echo -e "  ${YELLOW}查看狀態:${NC} ./status.sh"
echo -e "  ${YELLOW}停止服務:${NC} ./stop.sh"
echo -e "  ${YELLOW}重啟服務:${NC} ./restart.sh"
echo ""
echo -e "${YELLOW}按 Ctrl+C 停止所有服務${NC}"
echo ""

# 持續顯示日誌（可選）
# tail -f "$BACKEND_LOG" "$FRONTEND_LOG"

# 保持腳本運行
wait
