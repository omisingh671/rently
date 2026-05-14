import { Link } from "react-router-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type BaseVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "dark";

type ButtonSize = "sm" | "md" | "lg" | "fluid";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: BaseVariant;
  size?: ButtonSize;
  to?: string;
  icon?: ReactNode;
  iconRight?: ReactNode;
  outline?: boolean;
  className?: string;
  fullWidth?: boolean;
  onDark?: boolean;
}

const filled: Record<BaseVariant, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow",

  secondary:
    "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-sm",

  accent: "bg-accent text-white hover:bg-accent/90 shadow",

  success: "bg-green-600 text-white hover:bg-green-700 shadow",

  warning: "bg-amber-500 text-white hover:bg-amber-600 shadow",

  danger: "bg-red-600 text-white hover:bg-red-700 shadow",

  info: "bg-sky-500 text-white hover:bg-sky-600 shadow",

  dark: "bg-slate-900 text-white hover:bg-slate-800 shadow",
};

const outlineMap: Record<BaseVariant, string> = {
  primary:
    "border-2 border-indigo-500 text-indigo-500 bg-indigo-50/50 hover:bg-indigo-500 hover:text-white shadow-sm",

  secondary:
    "border-2 border-slate-200 text-slate-900 bg-slate-50/50 hover:bg-slate-50 shadow-sm",

  accent:
    "border-2 border-accent text-accent bg-accent/5 hover:bg-accent hover:text-white shadow-sm",

  success:
    "border-2 border-green-600 text-green-600 bg-green-50/50 hover:bg-green-600 hover:text-white shadow-sm",

  warning:
    "border-2 border-amber-500 text-amber-500 bg-amber-50/50 hover:bg-amber-500 hover:text-white shadow-sm",

  danger:
    "border-2 border-red-600 text-red-600 bg-red-50/50 hover:bg-red-600 hover:text-white shadow-sm",

  info: "border-2 border-sky-500 text-sky-500 bg-sky-50/50 hover:bg-sky-500 hover:text-white shadow-sm",

  dark: "border-2 border-slate-900 text-slate-900 bg-slate-50/30 hover:bg-slate-900 hover:text-white shadow-sm",
};

/* FILLED GLASS */
const onDarkFilledMap: Record<BaseVariant, string> = {
  primary:
    "bg-indigo-500/20 text-indigo-100 border border-indigo-500/40 hover:bg-indigo-500/30",

  secondary: "bg-white/10 text-white border border-white/20 hover:bg-white/20",

  accent:
    "bg-accent/20 text-accent-100 border border-accent/30 hover:bg-accent/30",

  success:
    "bg-green-500/20 text-green-100 border border-green-500/30 hover:bg-green-500/30",

  warning:
    "bg-amber-500/20 text-amber-100 border border-amber-500/30 hover:bg-amber-500/30",

  danger:
    "bg-red-500/20 text-red-100 border border-red-500/30 hover:bg-red-500/30",

  info: "bg-sky-500/20 text-sky-100 border border-sky-500/30 hover:bg-sky-500/30",

  dark: "bg-slate-500/20 text-slate-100 border border-slate-500/30 hover:bg-slate-500/30",
};

/* OUTLINE GLASS */
const onDarkOutlineMap: Record<BaseVariant, string> = {
  primary: "border border-indigo-300/40 text-indigo-200 hover:bg-indigo-500/10",

  secondary: "border border-white/20 text-white hover:bg-white/10",

  accent: "border border-accent-300/40 text-accent-200 hover:bg-accent/10",

  success: "border border-green-300/40 text-green-200 hover:bg-green-600/10",

  warning: "border border-amber-300/40 text-amber-200 hover:bg-amber-600/10",

  danger: "border border-red-300/40 text-red-200 hover:bg-red-600/10",

  info: "border border-sky-300/40 text-sky-200 hover:bg-sky-600/10",

  dark: "border border-slate-300/40 text-slate-200 hover:bg-slate-600/10",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  to,
  icon,
  iconRight,
  outline = false,
  className,
  fullWidth = false,
  onDark = false,
  ...rest
}: ButtonProps) {
  const sizeMap: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
    fluid: "px-6 py-4 text-base w-full",
  };

  let variantClasses = outline ? outlineMap[variant] : filled[variant];

  /* Override for dark-surface styles */
  if (onDark) {
    variantClasses = outline
      ? clsx(onDarkOutlineMap[variant], "backdrop-blur-sm transition-all")
      : clsx(onDarkFilledMap[variant], "backdrop-blur-sm transition-all");
  }

  const widthClass = fullWidth ? "w-full" : "inline-block";

  const classes = clsx(
    "inline-flex items-center justify-center gap-2 rounded-lg transition-all font-medium",
    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400",
    sizeMap[size],
    variantClasses,
    widthClass,
    "cursor-pointer",
    className
  );

  if (to) {
    return (
      <Link to={to} className={classes}>
        {icon && <span className="shrink-0 text-lg">{icon}</span>}
        {children}
        {iconRight && <span className="shrink-0 text-lg">{iconRight}</span>}
      </Link>
    );
  }

  return (
    <button className={classes} {...rest}>
      {icon && <span className="shrink-0 text-lg">{icon}</span>}
      {children}
      {iconRight && <span className="shrink-0 text-lg">{iconRight}</span>}
    </button>
  );
}
