import React from 'react';
import { motion, Easing } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BubbleLoaderProps {
    size?: number;
    className?: string;
}

const BubbleLoader: React.FC<BubbleLoaderProps> = ({ size = 130, className }) => {
    // Animation variants for the bubbles
    const dropAndShift = {
        animate: {
            x: [0, 80, 40, 40, 40, 40, 0],
            y: [15, 13, 10, -30, 55, 10, 15],
        },
    };

    const transition = (duration: number) => ({
        duration: duration,
        ease: "easeInOut" as Easing,
        repeat: Infinity,
        times: [0, 0.1667, 0.3334, 0.5001, 0.6668, 0.8335, 1]
    });

    const bubbleBaseClass = "absolute top-0 w-5 h-5 rounded-full z-10";

    return (
        <div
            className={cn("relative flex items-center justify-center", className)}
            style={{ width: size, height: size }}
        >
            {/* Strich1 Container - Rotated 45deg */}
            <div className="relative flex items-center justify-center w-[130px] h-[50px] rotate-45">
                {/* Strich1 Visual */}
                <div className="absolute inset-0 bg-black rounded-[25px] shadow-[0_4px_10px_rgba(0,0,0,0.4)] z-0" />

                {/* Strich2 Container - Rotated -90deg relative to Strich1 */}
                <div className="absolute inset-0 flex items-center justify-center -rotate-90 z-0">
                    {/* Strich2 Visual */}
                    <div className="absolute inset-0 bg-black rounded-[25px] shadow-[0_4px_10px_rgba(0,0,0,0.4)]" />

                    {/* Bubbles are inside Strich2, so they follow its coordinate system */}
                    {/* bubble */}
                    <motion.div
                        className={cn(bubbleBaseClass, "left-[15px]")}
                        style={{ background: "radial-gradient(circle at 30% 30%, #ffb3c1, #e64980, #ff8787)" }}
                        variants={dropAndShift}
                        animate="animate"
                        transition={transition(5)}
                    />

                    {/* bubble1 */}
                    <motion.div
                        className={cn(bubbleBaseClass, "left-[8px] z-20")}
                        style={{ background: "radial-gradient(circle at 30% 30%, #edb3ff, #ac49e6, #fb87ff)" }}
                        variants={dropAndShift}
                        animate="animate"
                        transition={transition(6)}
                    />

                    {/* bubble2 */}
                    <motion.div
                        className={cn(bubbleBaseClass, "left-[12px] z-30")}
                        style={{ background: "radial-gradient(circle at 30% 30%, #b3d8ff, #4963e6, #87a7ff)" }}
                        variants={dropAndShift}
                        animate="animate"
                        transition={transition(4)}
                    />

                    {/* bubble3 */}
                    <motion.div
                        className={cn(bubbleBaseClass, "left-[10px] z-40")}
                        style={{ background: "radial-gradient(circle at 30% 30%, #b3ffbc, #35a32f, #75ba61)" }}
                        variants={dropAndShift}
                        animate="animate"
                        transition={transition(7)}
                    />
                </div>
            </div>
        </div>
    );
};

export default BubbleLoader;
