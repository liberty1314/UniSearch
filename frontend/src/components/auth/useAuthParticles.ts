import { useEffect, useState } from 'react';

export interface AuthParticle {
  id: number;
  x: number;
  y: number;
  delay: number;
  duration: number;
}

export function useAuthParticles(count = 20): AuthParticle[] {
  const [particles, setParticles] = useState<AuthParticle[]>([]);

  useEffect(() => {
    const nextParticles = Array.from({ length: count }, (_, index) => ({
      id: index,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 10 + Math.random() * 10,
    }));

    setParticles(nextParticles);
  }, [count]);

  return particles;
}
