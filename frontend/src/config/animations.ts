// 动画配置文件
export const ANIMATION_CONFIG = {
  // 基础动画时长
  durations: {
    fast: 150,
    normal: 300,
    slow: 500,
    verySlow: 800,
  },

  // 缓动函数
  easings: {
    // 线性
    linear: 'linear',
    
    // 缓入
    easeIn: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeInQuad: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
    easeInCubic: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
    easeInQuart: 'cubic-bezier(0.895, 0.03, 0.685, 0.22)',
    easeInQuint: 'cubic-bezier(0.755, 0.05, 0.855, 0.06)',
    
    // 缓出
    easeOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOutQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
    easeOutQuart: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
    easeOutQuint: 'cubic-bezier(0.23, 1, 0.32, 1)',
    
    // 缓入缓出
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeInOutQuad: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
    easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
    easeInOutQuart: 'cubic-bezier(0.77, 0, 0.175, 1)',
    easeInOutQuint: 'cubic-bezier(0.86, 0, 0.07, 1)',
    
    // 特殊效果
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // 按钮动画
  button: {
    // 按压效果
    press: {
      scale: 0.95,
      duration: 150,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
    
    // 释放效果
    release: {
      scale: 1.0,
      duration: 300,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
    
    // 悬停效果
    hover: {
      scale: 1.05,
      duration: 200,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
    
    // 涟漪效果
    ripple: {
      duration: 600,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      scale: 4,
      opacity: 0,
    },
  },

  // 搜索状态动画
  search: {
    // 搜索中状态
    loading: {
      // 颜色过渡
      colorTransition: {
        duration: 300,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        from: '#007AFF', // 蓝色
        to: '#FF9500',   // 橙色
      },
      
      // 背景渐变
      background: {
        primary: 'linear-gradient(135deg, #FF9500 0%, #FFB340 100%)',
        hover: 'linear-gradient(135deg, #FFB340 0%, #FF9500 100%)',
        active: 'linear-gradient(135deg, #E6850E 0%, #FF9500 100%)',
      },
      
      // 阴影效果
      shadow: {
        normal: '0 2px 8px rgba(255, 149, 0, 0.3)',
        hover: '0 4px 16px rgba(255, 149, 0, 0.4)',
        active: '0 1px 4px rgba(255, 149, 0, 0.5)',
      },
      
      // 图标动画
      icon: {
        rotation: {
          duration: 1000,
          easing: 'linear',
          direction: 'clockwise',
        },
        pulse: {
          duration: 1500,
          easing: 'ease-in-out',
          scale: [1, 1.1, 1],
        },
      },
    },
    
    // 状态切换动画
    stateTransition: {
      duration: 300,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      properties: ['background-color', 'color', 'box-shadow', 'transform'],
    },
  },

  // 加载动画
  loading: {
    // 旋转
    spinner: {
      duration: 1000,
      easing: 'linear',
    },
    
    // 脉冲
    pulse: {
      duration: 1500,
      easing: 'ease-in-out',
    },
    
    // 弹跳
    bounce: {
      duration: 1000,
      easing: 'ease-in-out',
    },
    
    // 涟漪
    ripple: {
      duration: 1400,
      easing: 'ease-in-out',
    },
  },

  // 文字动画
  text: {
    fade: {
      duration: 200,
      easing: 'ease-out',
      translateY: 2,
    },
  },

  // 图标动画
  icon: {
    rotate: {
      duration: 300,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      scale: 1.1,
    },
  },

  // 页面过渡
  page: {
    fadeIn: {
      duration: 300,
      easing: 'ease-out',
    },
    slideUp: {
      duration: 300,
      easing: 'ease-out',
      translateY: 20,
    },
  },

  // 微交互
  micro: {
    // 缩放弹跳
    scaleBounce: {
      duration: 300,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      scale: 1.05,
    },
    
    // 轻微抖动
    shake: {
      duration: 500,
      easing: 'ease-in-out',
      translateX: 2,
    },
  },
};

// 生成CSS动画类
export const generateAnimationClasses = () => {
  const classes: Record<string, string> = {};
  
  // 按钮按压动画
  classes['animate-button-press'] = `animate-button-press ${ANIMATION_CONFIG.durations.fast}ms ${ANIMATION_CONFIG.easings.easeIn}`;
  
  // 按钮释放动画
  classes['animate-button-release'] = `animate-button-release ${ANIMATION_CONFIG.durations.normal}ms ${ANIMATION_CONFIG.easings.easeOut}`;
  
  // 涟漪动画
  classes['animate-ripple'] = `animate-ripple ${ANIMATION_CONFIG.button.ripple.duration}ms ${ANIMATION_CONFIG.button.ripple.easing}`;
  
  // 文字淡入动画
  classes['animate-text-fade'] = `animate-text-fade ${ANIMATION_CONFIG.text.fade.duration}ms ${ANIMATION_CONFIG.text.fade.easing}`;
  
  // 图标旋转动画
  classes['animate-icon-rotate'] = `animate-icon-rotate ${ANIMATION_CONFIG.icon.rotate.duration}ms ${ANIMATION_CONFIG.icon.rotate.easing}`;
  
  return classes;
};

// 导出默认配置
export default ANIMATION_CONFIG;
