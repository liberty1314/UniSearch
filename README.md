# UniSearch 网盘资源搜索

一个基于 Go 后端和 React 前端的网盘资源搜索应用。

## 快速启动

### 使用脚本启动（推荐）

#### 启动所有服务
```bash
./start.sh
```

这个脚本会：
1. 检查依赖和项目目录
2. 启动后端服务（端口 8888）
3. 等待后端服务启动完成
4. 启动前端服务（端口 5173）
5. 显示服务状态和访问地址

#### 停止所有服务
```bash
./stop.sh
```

这个脚本会：
1. 优雅停止所有前后端服务
2. 清理进程和PID文件
3. 备份日志文件
4. 验证服务是否已完全停止

### 手动启动

#### 启动后端
```bash
cd backend
go run main.go
```

#### 启动前端
```bash
cd frontend
pnpm install
pnpm run dev
```

## 访问地址

- 前端应用: http://localhost:5173
- 后端API: http://localhost:8888

## 项目结构

```
pansou/
├── backend/          # Go 后端服务
│   ├── main.go      # 主程序入口
│   ├── api/         # API 路由和处理器
│   ├── plugin/      # 搜索插件
│   └── ...
├── frontend/         # React 前端应用
│   ├── src/         # 源代码
│   ├── package.json # 依赖配置
│   └── ...
├── start.sh         # 启动脚本
├── stop.sh          # 停止脚本
└── README.md        # 项目说明
```

## 功能特性

### 前端功能
- 🔍 集成搜索功能的首页
- ⚙️ 搜索偏好设置
- 📊 系统状态监控
- 🎨 苹果风格UI设计
- 📱 响应式布局
- ⚡ 懒加载优化

### 后端功能
- 🚀 高性能Go服务
- 🔌 插件化搜索架构
- 💾 智能缓存系统
- 🔄 并发搜索处理
- 📡 RESTful API

## 开发说明

### 技术栈

**前端:**
- React 18
- TypeScript
- Tailwind CSS
- Zustand (状态管理)
- React Router v7
- Axios
- Vite

**后端:**
- Go 1.21+
- Gin Web Framework
- 并发搜索引擎
- 分片缓存系统

### 环境要求

- Go 1.21 或更高版本
- Node.js 18 或更高版本
- pnpm 包管理器

### 日志文件

启动脚本会生成以下日志文件：
- `backend.log` - 后端服务日志
- `frontend.log` - 前端服务日志

停止脚本会自动备份这些日志文件，格式为 `*.log.YYYYMMDD_HHMMSS`

### 故障排除

1. **端口被占用**
   - 脚本会自动检测端口占用情况
   - 可以选择继续启动或停止现有服务

2. **依赖缺失**
   - 确保已安装 Go 和 pnpm
   - 运行 `go mod download` 安装 Go 依赖
   - 运行 `pnpm install` 安装前端依赖

3. **服务启动失败**
   - 查看对应的日志文件
   - 检查端口是否被其他程序占用
   - 确保项目目录结构完整

## 许可证

MIT License