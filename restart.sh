#!/bin/bash

# YOLO Project - 重啟腳本
# 重新啟動所有服務

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/Users/vincewang/YOLO-Project"

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     YOLO Web Platform - 重啟服務          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# 停止服務
echo -e "${YELLOW}[1/2] 停止現有服務...${NC}"
"$PROJECT_DIR/stop.sh"

echo ""
sleep 2

# 啟動服務
echo -e "${YELLOW}[2/2] 啟動服務...${NC}"
exec "$PROJECT_DIR/start.sh"
