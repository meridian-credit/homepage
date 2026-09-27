import type { ReactNode } from "react";

/* StaggerChildren 안의 한 항목. 묶음 밖에 두면 그냥 보이는 div 다. */
interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <div className={className} data-reveal-item="">
      {children}
    </div>
  );
}
