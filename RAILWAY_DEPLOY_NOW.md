# 🚀 UniSearch Railway 立即部署指南

## 🎯 镜像信息

✅ **Docker镜像已推送到Docker Hub！**

- **最新版本**: `liberty159/unisearch:latest`
- **稳定版本**: `liberty159/unisearch:1.0` (推荐生产环境)
- **镜像大小**: 126MB
- **架构**: linux/amd64 (Railway兼容)

## 🚂 Railway部署步骤

### 1. 访问Railway Dashboard
- 打开 [Railway Dashboard](https://railway.app/dashboard)
- 点击 "New Project"

### 2. 选择部署方式
- 选择 **"Deploy from Docker Image"**

### 3. 配置Docker镜像
- **Image Name**: `liberty159/unisearch:1.0` (推荐)
- **Service Name**: `UniSearch`
- **Port**: `3000`

### 4. 配置环境变量

在Railway Dashboard中设置以下环境变量：

#### 🏗️ 基础配置
```bash
NODE_ENV=production
PORT=3000
TZ=Asia/Shanghai
```

#### 🔧 后端配置
```bash
BACKEND_PORT=8888
CACHE_ENABLED=true
CACHE_PATH=/app/cache
CACHE_MAX_SIZE=100
CACHE_TTL=60
```

#### ⚡ 异步插件配置
```bash
ASYNC_PLUGIN_ENABLED=true
ASYNC_RESPONSE_TIMEOUT=4
ASYNC_MAX_BACKGROUND_WORKERS=15
ASYNC_MAX_BACKGROUND_TASKS=75
ASYNC_CACHE_TTL_HOURS=1
```

#### 📡 TG频道配置
```bash
CHANNELS=tgsearchers3,SharePanBaidu,yunpanxunlei,tianyifc,BaiduCloudDisk
```

#### 🚀 性能优化配置
```bash
HTTP_MAX_CONNS=200
ASYNC_MAX_BACKGROUND_WORKERS=15
ASYNC_MAX_BACKGROUND_TASKS=75
```

#### 📝 日志配置
```bash
ASYNC_LOG_ENABLED=false
```

#### 🔒 安全配置
```bash
CORS_ENABLED=true
CORS_ALLOW_ORIGIN=*
```

### 5. 配置端口和健康检查
- **Port**: `3000`
- **Health Check Path**: `/health`
- **Health Check Timeout**: `300` 秒

### 6. 部署服务
点击 "Deploy" 开始部署。部署过程可能需要几分钟时间。

## 🔍 部署后验证

### 1. 检查服务状态
部署完成后，验证以下端点：

- **前端应用**: `https://your-app.railway.app/`
- **健康检查**: `https://your-app.railway.app/health`
- **后端API**: `https://your-app.railway.app/api/health`

### 2. 测试搜索功能
1. 访问前端页面
2. 输入搜索关键词
3. 验证搜索结果
4. 检查API响应

## 📊 服务架构

```
用户请求 → Railway → Docker容器
                    ↓
            ┌─────────────────┐
            │   Nginx (3000)  │ ← 前端服务
            └─────────────────┘
                    ↓
            ┌─────────────────┐
            │  Go API (8888)  │ ← 后端服务
            └─────────────────┘
                    ↓
            ┌─────────────────┐
            │  搜索插件系统   │ ← 21个插件
            └─────────────────┘
```

## 🎉 部署成功标志

✅ **前端服务**: 页面正常加载，搜索框可用  
✅ **后端服务**: API响应正常，健康检查通过  
✅ **搜索功能**: 能够执行搜索并返回结果  
✅ **插件系统**: 21个搜索插件正常工作  
✅ **缓存系统**: 二级缓存正常运行  

## 🔧 故障排除

### 常见问题

1. **健康检查失败**
   - 检查端口配置
   - 验证环境变量
   - 查看服务日志

2. **搜索无结果**
   - 检查插件配置
   - 验证TG频道设置
   - 查看后端日志

3. **前端无法访问**
   - 检查端口映射
   - 验证域名配置
   - 查看Nginx日志

### 查看日志

```bash
# 使用Railway CLI
railway logs --service UniSearch

# 实时日志
railway logs --follow --service UniSearch
```

## 📈 性能监控

### 关键指标
- **响应时间**: 首次搜索 <4秒，缓存命中 <100ms
- **并发支持**: 支持200+并发用户
- **缓存命中率**: 目标 >80%
- **插件可用性**: 21个插件 >95%可用

### 资源使用
- **内存**: 预计使用 200-500MB
- **CPU**: 预计使用 10-30%
- **存储**: 缓存目录 100-500MB

## 🎯 立即行动

1. **访问**: [Railway Dashboard](https://railway.app/dashboard)
2. **创建项目**: 选择 "Deploy from Docker Image"
3. **使用镜像**: `liberty159/unisearch:1.0`
4. **配置环境变量**: 参考上面的配置
5. **部署服务**: 点击 "Deploy"

---

**🚀 您的UniSearch服务已经准备就绪！**

**立即在Railway上部署吧！** 🎉
