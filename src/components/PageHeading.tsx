import { m, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

export function PageHeading({ title, children }: { title: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <m.header
      className="page-heading"
      initial={reduced ? false : { opacity: 0.7, clipPath: 'inset(0 0 6% 0)', y: 12 }}
      animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0)', y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <h1>{title}</h1>
      <p>{children}</p>
    </m.header>
  );
}
