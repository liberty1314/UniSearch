#!/usr/bin/env bash
# ===========================================
# 生产环境密钥生成辅助脚本 (P4 安全加固)
# ===========================================
# 用法: bash scripts/gen-production-secrets.sh
#
# 说明:
#   - 仅将生成结果输出到终端，绝不写入任何 .env 文件
#   - 每次运行都会生成全新随机值，请妥善保存到生产环境配置/密钥管理服务
#   - 需要本机安装 openssl
# ===========================================
set -euo pipefail

if ! command -v openssl >/dev/null 2>&1; then
  echo "错误: 未找到 openssl，请先安装后重试" >&2
  exit 1
fi

gen_b64() { openssl rand -base64 32; }   # 32 字节 -> 44 base64 字符
gen_hex() { openssl rand -hex 32; }

echo "# ====== 生产环境强随机密钥（请复制保存，勿提交版本库）======"
echo "SECRET_MASTER_KEY=$(gen_b64)"
echo "AUTH_JWT_SECRET=$(gen_b64)"
echo "REFRESH_TOKEN_ENCRYPT_KEY=$(gen_b64)"
echo "WATCHTOWER_TOKEN=$(gen_hex)"
echo
echo "# ====== 仍需手动填写的部署值（脚本无法代填）======"
echo "# DB_PASSWORD=        # 强密码: openssl rand -base64 24"
echo "# DB_USER=            # 专用账户，禁止使用 root"
echo "# REDIS_PASSWORD=     # 生产必设: openssl rand -base64 24"
echo "# DOMAIN=             # 真实域名"
echo "# SSL_EMAIL=          # Let's Encrypt 证书邮箱"
echo "# DOCKER_USERNAME=    # 镜像仓库用户名"
echo
echo "# 对照 .env.example 末尾「配置验证检查清单」逐项确认后再部署。"
