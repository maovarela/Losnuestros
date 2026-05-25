import { Icon } from "./icon";

type Variant =
  | "success"
  | "warn"
  | "danger"
  | "info"
  | "tertiary"
  | "neutral";

type Props = {
  children: React.ReactNode;
  variant?: Variant;
  icon?: string;
  className?: string;
};

const STYLES: Record<Variant, string> = {
  success: "bg-green-bg text-green",
  warn: "bg-amber-bg text-amber",
  danger: "bg-red-bg text-red",
  info: "bg-blue-bg text-blue",
  tertiary: "bg-purple-bg text-purple",
  neutral: "bg-bg-2 text-text-2",
};

export function Pill({ children, variant = "neutral", icon, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${STYLES[variant]} ${className}`}
    >
      {icon && <Icon name={icon} className="text-base" filled />}
      {children}
    </span>
  );
}
