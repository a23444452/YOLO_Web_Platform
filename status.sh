#!/bin/bash

# YOLO Project - 狀態查詢腳本
# 查看所有服務的運行狀態

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 項目路徑
PROJECT_DIR="/Users/vincewang/YOLO-Project"
PID_DIR="$PROJECT_DIR/.pids"
BACKEND_PID="$PID_DIR/backend.pid"
FRONTEND_PID="$PID_DIR/frontend.pid"

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     YOLO Web Platform - 服務狀態          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# 檢查後端狀態
echo -e "${BLUE}後端服務 (FastAPI):${NC}"
if [ -f "$BACKEND_PID" ]; then
    BACKEND_PROC=$(cat "$BACKEND_PID")
    if ps -p "$BACKEND_PROC" > /dev/null 2>&1; then
        echo -e "  狀態: ${GREEN}運行中${NC} (PID: $BACKEND_PROC)"

        # 檢查 HTTP 連接
        if curl -s http://localhost:8000/health > /dev/null 2>&1; then
            echo -e "  健康: ${GREEN}正常${NC}"
            echo -e "  URL: ${BLUE}http://localhost:8000${NC}"
            echo -e "  API 文檔: ${BLUE}http://localhost:8000/docs${NC}"
        else
            echo -e "  健康: ${RED}無法連接${NC}"
        fi
    else
        echo -e "  狀態: ${RED}已停止${NC} (PID 檔案存在但進程不存在)"
    fi
else
    echo -e "  狀態: ${RED}已停止${NC}"
fi

echo ""

# 檢查前端狀態
echo -e "${BLUE}前端服務 (Vite):${NC}"
if [ -f "$FRONTEND_PID" ]; then
    FRONTEND_PROC=$(cat "$FRONTEND_PID")
    if ps -p "$FRONTEND_PROC" > /dev/null 2>&1; then
        echo -e "  狀態: ${GREEN}運行中${NC} (PID: $FRONTEND_PROC)"

        # 檢查 HTTP 連接
        if curl -s http://localhost:5173 > /dev/null 2>&1; then
            echo -e "  健康: ${GREEN}正常${NC}"
            echo -e "  URL: ${BLUE}http://localhost:5173${NC}"
        else
            echo -e "  健康: ${RED}無法連接${NC}"
        fi
    else
        echo -e "  狀態: ${RED}已停止${NC} (PID 檔案存在但進程不存在)"
    fi
else
    echo -e "  狀態: ${RED}已停止${NC}"
fi

echo ""

# 顯示資源使用情況
echo -e "${BLUE}資源使用:${NC}"

if [ -f "$BACKEND_PID" ] && ps -p "$(cat $BACKEND_PID)" > /dev/null 2>&1; then
    BACKEND_MEM=$(ps -p "$(cat $BACKEND_PID)" -o %mem | tail -n 1 | xargs)
    BACKEND_CPU=$(ps -p "$(cat $BACKEND_PID)" -o %cpu | tail -n 1 | xargs)
    echo -e "  後端 - CPU: ${YELLOW}${BACKEND_CPU}%${NC}, 記憶體: ${YELLOW}${BACKEND_MEM}%${NC}"
fi

if [ -f "$FRONTEND_PID" ] && ps -p "$(cat $FRONTEND_PID)" > /dev/null 2>&1; then
    FRONTEND_MEM=$(ps -p "$(cat $FRONTEND_PID)" -o %mem | tail -n 1 | xargs)
    FRONTEND_CPU=$(ps -p "$(cat $FRONTEND_PID)" -o %cpu | tail -n 1 | xargs)
    echo -e "  前端 - CPU: ${YELLOW}${FRONTEND_CPU}%${NC}, 記憶體: ${YELLOW}${FRONTEND_MEM}%${NC}"
fi

echo ""

# 顯示日誌位置
echo -e "${BLUE}日誌檔案:${NC}"
echo -e "  後端: ${YELLOW}$PROJECT_DIR/logs/backend.log${NC}"
echo -e "  前端: ${YELLOW}$PROJECT_DIR/logs/frontend.log${NC}"

echo ""
