import React from 'react';
import { cn } from '../../utils/classNames';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', icon, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 disabled:pointer-events-none disabled:opacity-50 select-none rounded-md text-sm border';

    const variants = {
      primary: 'bg-[#0F52BA] text-white hover:bg-[#0c4397] border-[#0F52BA] shadow-none active:bg-[#0a387d]',
      secondary: 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300 shadow-none active:bg-slate-100',
      outline: 'bg-transparent text-slate-700 hover:bg-slate-100 border-slate-300',
      ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 border-transparent hover:text-slate-900',
      danger: 'bg-red-600 text-white hover:bg-red-700 border-red-600',
    };

    const sizes = {
      sm: 'h-8 px-2.5 text-xs gap-1.5',
      md: 'h-9 px-3.5 text-sm gap-2',
      lg: 'h-10 px-4 text-sm gap-2',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {icon && <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
