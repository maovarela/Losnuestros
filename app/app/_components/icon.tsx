type Props = {
  name: string;
  filled?: boolean;
  className?: string;
};

export function Icon({ name, filled = false, className = "" }: Props) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${filled ? "icon-fill" : ""} ${className}`}
    >
      {name}
    </span>
  );
}
