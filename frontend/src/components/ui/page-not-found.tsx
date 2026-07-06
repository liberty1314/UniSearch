import { ArrowLeft, House, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BLUE_CYAN_TEXT_GRADIENT } from '@/lib/brandTheme';

type StickFigure = {
  top?: string;
  bottom?: string;
  src: string;
  transform?: string;
  speedX: number;
  speedRotation?: number;
};

type Circle = {
  x: number;
  y: number;
  size: number;
};

const STICK_FIGURES: StickFigure[] = [
  {
    top: '0%',
    src: 'https://raw.githubusercontent.com/RicardoYare/imagenes/9ef29f5bbe075b1d1230a996d87bca313b9b6a63/sticks/stick0.svg',
    transform: 'rotateZ(-90deg)',
    speedX: 1500,
  },
  {
    top: '10%',
    src: 'https://raw.githubusercontent.com/RicardoYare/imagenes/9ef29f5bbe075b1d1230a996d87bca313b9b6a63/sticks/stick1.svg',
    speedX: 3000,
    speedRotation: 2000,
  },
  {
    top: '20%',
    src: 'https://raw.githubusercontent.com/RicardoYare/imagenes/9ef29f5bbe075b1d1230a996d87bca313b9b6a63/sticks/stick2.svg',
    speedX: 5000,
    speedRotation: 1000,
  },
  {
    top: '25%',
    src: 'https://raw.githubusercontent.com/RicardoYare/imagenes/9ef29f5bbe075b1d1230a996d87bca313b9b6a63/sticks/stick0.svg',
    speedX: 2500,
    speedRotation: 1500,
  },
  {
    top: '35%',
    src: 'https://raw.githubusercontent.com/RicardoYare/imagenes/9ef29f5bbe075b1d1230a996d87bca313b9b6a63/sticks/stick0.svg',
    speedX: 2000,
    speedRotation: 300,
  },
  {
    bottom: '5%',
    src: 'https://raw.githubusercontent.com/RicardoYare/imagenes/9ef29f5bbe075b1d1230a996d87bca313b9b6a63/sticks/stick3.svg',
    speedX: 0,
  },
];

const PRIMARY_BUTTON_GRADIENT = 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500';
const SURFACE_GLOW = 'shadow-[0_24px_60px_rgba(6,182,212,0.16)]';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function NotFoundPage() {
  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(6,182,212,0.16),transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.16),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_46%,#ecfeff_100%)]">
      <MessageDisplay />
      <CharactersAnimation />
      <CircleAnimation />
    </div>
  );
}

function MessageDisplay() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setIsVisible(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setIsVisible(true);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center px-6 py-10 sm:px-10">
      <div
        className={`glass-card-premium flex max-w-3xl flex-col items-center rounded-[2rem] border border-white/80 px-6 py-8 text-center text-slate-900 ${SURFACE_GLOW} transition-opacity duration-500 sm:px-10 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="text-[clamp(2rem,4vw,2.5rem)] font-semibold tracking-tight text-slate-800">
          页面未找到
        </div>
        <div className={`${BLUE_CYAN_TEXT_GRADIENT} text-[clamp(4rem,10vw,5rem)] font-bold leading-none`}>
          404
        </div>
        <div className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
          抱歉，您访问的页面可能已被移除、名称已更改，或暂时不可用。
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="glass-toolbar group inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-6 py-2 text-base font-medium text-slate-700 transition-all duration-300 ease-in-out hover:scale-[1.03] hover:border-cyan-300 hover:text-cyan-700"
          >
            <ArrowLeft className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1" />
            返回上一页
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className={`group inline-flex min-h-11 items-center gap-2 rounded-xl ${PRIMARY_BUTTON_GRADIENT} border border-cyan-200/60 px-6 py-2 text-base font-medium text-white shadow-glass-strong transition-all duration-300 ease-in-out hover:scale-[1.03] hover:shadow-glass-strong dark:border-cyan-200/20`}
          >
            <House className="h-5 w-5 transition-transform duration-300 group-hover:translate-y-[-1px]" />
            回到首页
          </button>
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="glass-toolbar group inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-6 py-2 text-base font-medium text-slate-700 transition-all duration-300 ease-in-out hover:border-cyan-300 hover:text-cyan-700"
          >
            <Search className="h-5 w-5" />
            去搜索
          </button>
        </div>
      </div>
    </div>
  );
}

function CharactersAnimation() {
  const charactersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeAnimations: Animation[] = [];

    const clearCharacters = () => {
      activeAnimations.forEach((animation) => animation.cancel());
      activeAnimations.length = 0;

      if (charactersRef.current) {
        charactersRef.current.innerHTML = '';
      }
    };

    const spawnCharacters = () => {
      const container = charactersRef.current;
      if (!container) return;

      clearCharacters();

      if (prefersReducedMotion()) {
        return;
      }

      STICK_FIGURES.forEach((figure, index) => {
        const stick = document.createElement('img');
        const isStaticFigure = index === STICK_FIGURES.length - 1;
        stick.alt = '';
        stick.classList.add('characters');
        stick.style.position = 'absolute';
        stick.style.width = '18%';
        stick.style.height = '18%';
        stick.style.left = isStaticFigure ? '8%' : '100%';

        if (isStaticFigure) {
          stick.dataset.stickRole = 'static-left';
        }

        if (figure.top) stick.style.top = figure.top;
        if (figure.bottom) stick.style.bottom = figure.bottom;
        if (figure.transform) stick.style.transform = figure.transform;

        stick.src = figure.src;
        container.appendChild(stick);

        if (figure.speedX > 0 && typeof stick.animate === 'function') {
          const movement = stick.animate([{ left: '100%' }, { left: '-20%' }], {
            duration: figure.speedX,
            easing: 'linear',
            fill: 'forwards',
          });
          activeAnimations.push(movement);
        }

        if (index === 0 || !figure.speedRotation) return;

        if (typeof stick.animate === 'function') {
          const rotation = stick.animate(
            [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-360deg)' }],
            {
              duration: figure.speedRotation,
              iterations: Infinity,
              easing: 'linear',
            }
          );
          activeAnimations.push(rotation);
        }
      });
    };

    spawnCharacters();
    window.addEventListener('resize', spawnCharacters);

    return () => {
      window.removeEventListener('resize', spawnCharacters);
      clearCharacters();
    };
  }, []);

  return (
    <div
      ref={charactersRef}
      data-layer="characters"
      className="pointer-events-none absolute z-[110] h-[95%] w-[99%]"
      aria-hidden="true"
    />
  );
}

function CircleAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestIdRef = useRef<number>();
  const timerRef = useRef(0);
  const circlesRef = useRef<Circle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (prefersReducedMotion()) {
      return;
    }

    const initCircles = () => {
      circlesRef.current = [];

      for (let index = 0; index < 300; index++) {
        const randomX =
          Math.floor(Math.random() * (canvas.width * 1.8 + 1)) + canvas.width * 1.2;
        const randomY =
          Math.floor(Math.random() * (canvas.height * 1.2 + 1)) - canvas.height * 0.2;
        const size = canvas.width / 1000;

        circlesRef.current.push({ x: randomX, y: randomY, size });
      }
    };

    const draw = () => {
      const context = canvas.getContext('2d');
      if (!context) return;

      timerRef.current += 1;
      context.setTransform(1, 0, 0, 1, 0, 0);

      const distanceX = canvas.width / 80;
      const growthRate = canvas.width / 1000;

      context.fillStyle = 'rgba(248, 250, 252, 0.98)';
      context.clearRect(0, 0, canvas.width, canvas.height);

      circlesRef.current.forEach((circle) => {
        context.beginPath();

        if (timerRef.current < 65) {
          circle.x -= distanceX;
          circle.size += growthRate;
        }

        if (timerRef.current > 65 && timerRef.current < 500) {
          circle.x -= distanceX * 0.02;
          circle.size += growthRate * 0.2;
        }

        context.arc(circle.x, circle.y, circle.size, 0, 360);
        context.fill();
      });

      if (timerRef.current > 500) {
        if (requestIdRef.current) {
          cancelAnimationFrame(requestIdRef.current);
        }
        return;
      }

      requestIdRef.current = requestAnimationFrame(draw);
    };

    const resetCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      timerRef.current = 0;

      if (requestIdRef.current) {
        cancelAnimationFrame(requestIdRef.current);
      }

      const context = canvas.getContext('2d');
      if (context?.reset) {
        context.reset();
      } else {
        context?.setTransform(1, 0, 0, 1, 0, 0);
        context?.clearRect(0, 0, canvas.width, canvas.height);
      }

      initCircles();
      draw();
    };

    resetCanvas();
    window.addEventListener('resize', resetCanvas);

    return () => {
      window.removeEventListener('resize', resetCanvas);
      if (requestIdRef.current) {
        cancelAnimationFrame(requestIdRef.current);
      }
    };
  }, []);

  return <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />;
}
