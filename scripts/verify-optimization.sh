#!/bin/bash

# 插件超时优化验证脚本
# 用于验证部署后的效果

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
API_URL="${API_URL:-http://localhost:8080}"
TEST_KEYWORD="金特务：本色回归"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}插件超时优化效果验证脚本${NC}"
echo -e "${BLUE}================================================${NC}\n"

# 1. 检查 API 可访问性
echo -e "${YELLOW}[1/5] 检查 API 可访问性...${NC}"
if curl -s -f "${API_URL}/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API 可访问${NC}\n"
else
    echo -e "${RED}✗ API 不可访问，请检查服务是否运行${NC}\n"
    exit 1
fi

# 2. 测试搜索性能
echo -e "${YELLOW}[2/5] 测试搜索性能（渐进式搜索）...${NC}"
START_TIME=$(date +%s.%N)

RESPONSE=$(curl -s -X POST "${API_URL}/api/search/progressive" \
    -H "Content-Type: application/json" \
    -d "{\"keyword\":\"${TEST_KEYWORD}\",\"sourceType\":\"all\"}" \
    -w "\n%{time_total}" 2>&1 | tail -1)

END_TIME=$(date +%s.%N)
DURATION=$(echo "$END_TIME - $START_TIME" | bc)

echo -e "  搜索耗时: ${BLUE}${DURATION}${NC} 秒"

if (( $(echo "$DURATION < 12" | bc -l) )); then
    echo -e "${GREEN}✓ 搜索性能良好（< 12 秒）${NC}\n"
elif (( $(echo "$DURATION < 20" | bc -l) )); then
    echo -e "${YELLOW}⚠ 搜索性能一般（12-20 秒）${NC}\n"
else
    echo -e "${RED}✗ 搜索性能较差（> 20 秒）${NC}\n"
fi

# 3. 检查插件健康状态
echo -e "${YELLOW}[3/5] 检查插件健康状态...${NC}"
HEALTH_DATA=$(curl -s "${API_URL}/api/search/observability" 2>/dev/null || echo "{}")

if [ -n "$HEALTH_DATA" ] && [ "$HEALTH_DATA" != "{}" ]; then
    echo "$HEALTH_DATA" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_DATA"

    # 提取关键指标
    TIMEOUT_COUNT=$(echo "$HEALTH_DATA" | grep -o '"timeout_count":[0-9]*' | grep -o '[0-9]*' | head -1)
    WARNING_COUNT=$(echo "$HEALTH_DATA" | grep -o '"warning_count":[0-9]*' | grep -o '[0-9]*' | head -1)

    if [ -n "$TIMEOUT_COUNT" ]; then
        echo -e "  插件超时次数: ${BLUE}${TIMEOUT_COUNT}${NC}"
        if [ "$TIMEOUT_COUNT" -lt 3 ]; then
            echo -e "${GREEN}✓ 超时次数较少${NC}"
        else
            echo -e "${YELLOW}⚠ 超时次数偏高${NC}"
        fi
    fi

    if [ -n "$WARNING_COUNT" ]; then
        echo -e "  Warning 数量: ${BLUE}${WARNING_COUNT}${NC}"
        if [ "$WARNING_COUNT" -lt 5 ]; then
            echo -e "${GREEN}✓ Warning 数量正常${NC}"
        else
            echo -e "${YELLOW}⚠ Warning 数量偏高${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠ 无法获取健康监控数据${NC}"
fi
echo ""

# 4. 测试多次搜索获取平均值
echo -e "${YELLOW}[4/5] 执行连续 3 次搜索测试...${NC}"
TOTAL_TIME=0
SUCCESS_COUNT=0

for i in {1..3}; do
    echo -e "  测试 $i/3..."
    START=$(date +%s.%N)

    if curl -s -f -X POST "${API_URL}/api/search/progressive" \
        -H "Content-Type: application/json" \
        -d "{\"keyword\":\"测试关键词${i}\",\"sourceType\":\"all\"}" \
        > /dev/null 2>&1; then
        END=$(date +%s.%N)
        TIME=$(echo "$END - $START" | bc)
        TOTAL_TIME=$(echo "$TOTAL_TIME + $TIME" | bc)
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        echo -e "    耗时: ${BLUE}${TIME}${NC} 秒"
    else
        echo -e "    ${RED}失败${NC}"
    fi
done

if [ "$SUCCESS_COUNT" -gt 0 ]; then
    AVG_TIME=$(echo "scale=2; $TOTAL_TIME / $SUCCESS_COUNT" | bc)
    echo -e "\n  平均搜索耗时: ${BLUE}${AVG_TIME}${NC} 秒"

    if (( $(echo "$AVG_TIME < 10" | bc -l) )); then
        echo -e "${GREEN}✓ 平均性能优秀（< 10 秒）${NC}\n"
    elif (( $(echo "$AVG_TIME < 15" | bc -l) )); then
        echo -e "${GREEN}✓ 平均性能良好（< 15 秒）${NC}\n"
    else
        echo -e "${YELLOW}⚠ 平均性能需要优化（> 15 秒）${NC}\n"
    fi
else
    echo -e "${RED}✗ 所有测试均失败${NC}\n"
fi

# 5. 生成优化建议
echo -e "${YELLOW}[5/5] 生成优化建议...${NC}"

if (( $(echo "$AVG_TIME > 10" | bc -l) )); then
    echo -e "${YELLOW}建议：${NC}"
    echo -e "  1. 检查是否有特定插件频繁超时"
    echo -e "  2. 考虑临时禁用慢速插件"
    echo -e "  3. 调整环境变量 PLUGIN_TIMEOUT=8"
    echo -e "  4. 启用缓存预热机制"
elif [ "$TIMEOUT_COUNT" -gt 5 ]; then
    echo -e "${YELLOW}建议：${NC}"
    echo -e "  1. 查看日志识别超时插件: grep '插件搜索超时'"
    echo -e "  2. 在 ENABLED_PLUGINS 中移除问题插件"
    echo -e "  3. 检查网络连接和代理配置"
else
    echo -e "${GREEN}优化效果良好！无需额外调整。${NC}"
fi

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}验证完成${NC}"
echo -e "${BLUE}================================================${NC}"

# 输出总结
echo -e "\n${GREEN}总结：${NC}"
echo -e "  - 搜索耗时: ${DURATION} 秒"
echo -e "  - 平均耗时: ${AVG_TIME} 秒"
if [ -n "$TIMEOUT_COUNT" ]; then
    echo -e "  - 超时次数: ${TIMEOUT_COUNT}"
fi
if [ -n "$WARNING_COUNT" ]; then
    echo -e "  - Warning: ${WARNING_COUNT}"
fi

# 对比优化前后
echo -e "\n${BLUE}优化效果对比：${NC}"
echo -e "  - 优化前平均耗时: 14.5 秒"
echo -e "  - 优化后平均耗时: ${AVG_TIME} 秒"
if [ -n "$AVG_TIME" ] && (( $(echo "$AVG_TIME < 14.5" | bc -l) )); then
    IMPROVEMENT=$(echo "scale=1; (14.5 - $AVG_TIME) / 14.5 * 100" | bc)
    echo -e "  - 性能提升: ${GREEN}${IMPROVEMENT}%${NC} 🎉"
fi
