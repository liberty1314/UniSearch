# 搜索按钮动画组件使用指南

本文档介绍了UniSearch项目中搜索按钮的动画过渡效果实现，包括组件使用方法、动画特性和最佳实践。

## 🎯 功能特性

### 1. 流畅的按钮状态过渡
- **按压效果**：点击时按钮缩小到95%，提供触觉反馈
- **悬停效果**：鼠标悬停时按钮放大到105%，增强交互性
- **涟漪效果**：点击位置产生扩散动画，提升用户体验
- **状态切换**：正常状态、加载状态、禁用状态之间的平滑过渡

### 2. 多种加载动画
- **旋转加载**：经典圆形旋转动画
- **点状加载**：三个点依次脉冲效果
- **脉冲加载**：整体缩放脉冲效果
- **弹跳加载**：三个点依次弹跳效果
- **涟漪加载**：同心圆扩散效果

### 3. 响应式设计
- 支持触摸设备的手势操作
- 跨浏览器兼容性
- 性能优化的动画实现

## 🚀 快速开始

### 安装依赖
```bash
pnpm install
```

### 基本使用

#### 1. 搜索按钮组件
```tsx
import { SearchBox } from '@/components/SearchBox';

function App() {
  return (
    <SearchBox
      placeholder="搜索网盘资源..."
      autoFocus={true}
      onSearch={(keyword) => console.log('搜索:', keyword)}
    />
  );
}
```

#### 2. 动画按钮组件
```tsx
import { AnimatedButton } from '@/components/AnimatedButton';

function MyComponent() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <AnimatedButton
      onClick={() => setIsLoading(true)}
      loading={isLoading}
      loadingText="处理中..."
      variant="primary"
      size="md"
      icon={<Search className="w-4 h-4" />}
    >
      搜索
    </AnimatedButton>
  );
}
```

#### 3. 加载动画组件
```tsx
import { LoadingSpinner } from '@/components/LoadingSpinner';

function LoadingComponent() {
  return (
    <div className="flex space-x-4">
      <LoadingSpinner size="sm" variant="spinner" color="primary" />
      <LoadingSpinner size="md" variant="dots" color="white" />
      <LoadingSpinner size="lg" variant="pulse" color="gray" />
    </div>
  );
}
```

## 📚 组件API

### AnimatedButton

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `children` | ReactNode | - | 按钮内容 |
| `onClick` | () => void | - | 点击回调函数 |
| `disabled` | boolean | false | 是否禁用 |
| `loading` | boolean | false | 是否显示加载状态 |
| `variant` | 'primary' \| 'secondary' \| 'ghost' | 'primary' | 按钮样式变体 |
| `size` | 'sm' \| 'md' \| 'lg' | 'md' | 按钮尺寸 |
| `icon` | ReactNode | - | 按钮图标 |
| `loadingText` | string | - | 加载状态文字 |
| `showRipple` | boolean | true | 是否显示涟漪效果 |
| `loadingVariant` | string | 'spinner' | 加载动画类型 |

### LoadingSpinner

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `size` | 'sm' \| 'md' \| 'lg' \| 'xl' | 'md' | 加载图标尺寸 |
| `variant` | 'spinner' \| 'dots' \| 'pulse' \| 'bounce' \| 'ripple' | 'spinner' | 加载动画类型 |
| `color` | 'primary' \| 'white' \| 'gray' | 'primary' | 加载图标颜色 |
| `className` | string | - | 自定义CSS类名 |

### SearchBox

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `className` | string | - | 自定义CSS类名 |
| `placeholder` | string | '搜索网盘资源...' | 输入框占位符 |
| `autoFocus` | boolean | false | 是否自动聚焦 |
| `onSearch` | (keyword: string) => void | - | 搜索回调函数 |

## 🎨 动画配置

### 动画时长
```typescript
const ANIMATION_CONFIG = {
  durations: {
    fast: 150,      // 快速动画
    normal: 300,    // 标准动画
    slow: 500,      // 慢速动画
    verySlow: 800,  // 很慢的动画
  }
};
```

### 缓动函数
```typescript
const easings = {
  // 标准缓动
  easeIn: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  
  // 特殊效果
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
};
```

## 🔧 自定义动画

### 1. 修改Tailwind配置
在 `tailwind.config.js` 中添加自定义动画：

```javascript
module.exports = {
  theme: {
    extend: {
      animation: {
        'custom-bounce': 'customBounce 0.5s ease-in-out',
      },
      keyframes: {
        customBounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
};
```

### 2. 创建自定义钩子
```typescript
import { useButtonAnimation } from '@/hooks/useButtonAnimation';

const useCustomButtonAnimation = (options) => {
  const baseAnimation = useButtonAnimation(options);
  
  // 添加自定义逻辑
  const customEffect = () => {
    // 自定义动画效果
  };
  
  return {
    ...baseAnimation,
    customEffect,
  };
};
```

## 📱 移动端适配

### 触摸事件支持
所有按钮组件都支持触摸事件，包括：
- `onTouchStart`：触摸开始
- `onTouchEnd`：触摸结束
- 触摸反馈动画

### 响应式设计
- 支持不同屏幕尺寸
- 触摸友好的按钮大小
- 手势操作优化

## 🎯 最佳实践

### 1. 动画时长
- **快速反馈**：150ms（按钮按压、悬停）
- **状态切换**：300ms（加载状态、文字变化）
- **复杂动画**：500ms+（页面过渡、复杂效果）

### 2. 性能优化
- 使用 `transform` 和 `opacity` 进行动画
- 避免动画 `layout` 和 `paint`
- 合理使用 `will-change` 属性

### 3. 用户体验
- 提供即时视觉反馈
- 保持动画一致性
- 考虑可访问性（减少动画、提供开关）

### 4. 浏览器兼容性
- 使用 `@supports` 检测特性支持
- 提供降级方案
- 测试主流浏览器

## 🧪 测试

### 运行演示
```bash
# 启动开发服务器
pnpm dev

# 访问动画演示页面
# http://localhost:5173/animation-demo
```

### 测试要点
- [ ] 按钮按压效果
- [ ] 涟漪动画
- [ ] 加载状态切换
- [ ] 触摸设备支持
- [ ] 键盘导航
- [ ] 屏幕阅读器兼容性

## 🐛 常见问题

### Q: 动画不流畅怎么办？
A: 检查是否使用了 `transform` 和 `opacity`，避免改变 `width`、`height` 等属性。

### Q: 如何禁用动画？
A: 可以通过CSS变量或Tailwind类来控制动画的启用/禁用。

### Q: 触摸设备上动画卡顿？
A: 确保使用了触摸事件优化，避免同时触发多个动画。

## 📄 许可证

本项目采用 MIT 许可证。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进动画效果！

---

**注意**：本文档会随着项目发展持续更新，请关注最新版本。
