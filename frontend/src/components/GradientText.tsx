import React, { ReactNode } from 'react';
import { toStyleVars } from '@/lib/styleVars';

interface GradientTextProps {
    children: ReactNode;
    className?: string;
    colors?: string[];
    animationSpeed?: number;
    showBorder?: boolean;
}

export default function GradientText({
    children,
    className = "",
    colors = ["#ffaa40", "#9c40ff", "#ffaa40"],
    animationSpeed = 8,
    showBorder = false,
}: GradientTextProps) {
    const gradientStyle = toStyleVars({
        '--gradient-text-image': `linear-gradient(to right, ${colors.join(', ')})`,
        '--gradient-text-duration': `${animationSpeed}s`,
        '--gradient-text-size': '300% 100%',
    });

    return (
        <div
            className={`relative mx-auto flex max-w-fit flex-row items-center justify-center rounded-[1.25rem] font-medium backdrop-blur transition-shadow duration-500 overflow-hidden ${className}`}
        >
            {showBorder && (
                <div
                    className="absolute inset-0 bg-cover z-0 pointer-events-none animate-gradient gradient-text-dynamic"
                    style={gradientStyle}
                >
                    <div
                        className="absolute inset-0 bg-white dark:bg-slate-900 rounded-[1.25rem] z-[-1] gradient-text-mask-inner"
                    ></div>
                </div>
            )}
            <div
                className="inline-block relative z-10 text-transparent bg-cover bg-clip-text animate-gradient gradient-text-dynamic"
                style={gradientStyle}
            >
                {children}
            </div>
        </div>
    );
}
