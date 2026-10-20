interface IconProps {
  name: string;
  filled?: boolean;
  size?: number;
  className?: string;
  onClick?: () => void;
}

export function Icon({ name, filled, size = 24, className = '', onClick }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontSize: `${size}px`,
        fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0",
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {name}
    </span>
  );
}
