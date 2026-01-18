#!/bin/bash

# YOLO Project - 停止腳本
# 停止所有運行中的服務

set -e

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

echo -e "${BLUE}正在停止 YOLO Web Platform 服務...${NC}"
echo ""

# 停止後端
if [ -f "$BACKEND_PID" ]; then
    BACKEND_PROC=$(cat "$BACKEND_PID")
    if ps -p "$BACKEND_PROC" > /dev/null 2>&1; then
        echo -e "${YELLOW}停止後端服務 (PID: $BACKEND_PROC)...${NC}"
        kill "$BACKEND_PROC" 2>/dev/null || true
        sleep 2

        # 強制終止（如果還在運行）
        if ps -p "$BACKEND_PROC" > /dev/null 2>&1; then
            echo -e "${YELLOW}強制停止後端服務...${NC}"
            kill -9 "$BACKEND_PROC" 2>/dev/null || true
        fi

        echo -e "${GREEN}✓ 後端服務已停止${NC}"
    else
        echo -e "${YELLOW}後端服務未運行${NC}"
    fi
    rm -f "$BACKEND_PID"
else
    echo -e "${YELLOW}未找到後端 PID 檔案${NC}"
fi

# 停止前端
if [ -f "$FRONTEND_PID" ]; then
    FRONTEND_PROC=$(cat "$FRONTEND_PID")
    if ps -p "$FRONTEND_PROC" > /dev/null 2>&1; then
        echo -e "${YELLOW}停止前端服務 (PID: $FRONTEND_PROC)...${NC}"
        kill "$FRONTEND_PROC" 2>/dev/null || true
        sleep 2

        # 強制終止（如果還在運行）
        if ps -p "$FRONTEND_PROC" > /dev/null 2>&1; then
            echo -e "${YELLOW}強制停止前端服務...${NC}"
            kill -9 "$FRONTEND_PROC" 2>/dev/null || true
        fi

        echo -e "${GREEN}✓ 前端服務已停止${NC}"
    else
        echo -e "${YELLOW}前端服務未運行${NC}"
    fi
    rm -f "$FRONTEND_PID"
else
    echo -e "${YELLOW}未找到前端 PID 檔案${NC}"
fi

# 清理可能殘留的進程
echo ""
echo -e "${YELLOW}清理殘留進程...${NC}"

# 清理可能的 Python 後端進程
pkill -f "python -m yolo_api.main" 2>/dev/null || true

# 清理可能的 Node.js 前端進程
pkill -f "vite.*5173" 2>/dev/null || true

echo -e "${GREEN}✓ 清理完成${NC}"
echo ""
echo -e "${GREEN}所有服務已停止${NC}"
