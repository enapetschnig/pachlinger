interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const heights: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "h-8",
  md: "h-10",
  lg: "h-14",
  xl: "h-20",
};

export function Logo({ size = "md", className = "" }: LogoProps) {
  return (
    <img
      src="/pachlinger-logo.png"
      alt="Pachlinger GmbH"
      className={`${heights[size]} w-auto object-contain ${className}`}
    />
  );
}
