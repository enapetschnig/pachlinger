interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ size = "md", className = "" }: LogoProps) {
  const cls =
    size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-xl";
  return (
    <span className={`font-extrabold tracking-tight leading-none ${cls} ${className}`}>
      <span className="text-pachlinger-red">Pachlinger</span>
      <span className="text-pachlinger-anthracite"> GmbH</span>
    </span>
  );
}
