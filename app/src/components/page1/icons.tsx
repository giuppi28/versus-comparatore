import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/** 24x24 stroke icons in the same style as the UI kit (currentColor, rounded caps). */
function Svg({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={28}
      height={28}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

// ---- Block A: commodity -----------------------------------------------------

export function BoltIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </Svg>
  );
}

export function FlameIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 22c4 0 7-2.7 7-7 0-3-1.6-5-3-6.5-.3 1.6-1.2 2.6-2.2 3C13.8 8 12.5 4.5 10 2c0 3.5-2 5.5-3.7 7.5C5 11 5 13 5 15c0 4.3 3 7 7 7z" />
      <path d="M12 21a3 3 0 0 1-3-3c0-1.8 1.5-2.7 3-5 1.5 2.3 3 3.2 3 5a3 3 0 0 1-3 3z" />
    </Svg>
  );
}

export function BoltFlameIcon() {
  return (
    <span className="flex items-center gap-0.5">
      <BoltIcon width={20} height={20} />
      <FlameIcon width={20} height={20} />
    </span>
  );
}

// ---- Block B: customer type -------------------------------------------------

export function HomeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h5v-6h4v6h5V10" />
    </Svg>
  );
}

export function BuildingIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17" />
      <path d="M14 9h5a1 1 0 0 1 1 1v11" />
      <path d="M2 21h20M8 7h2M8 11h2M8 15h2M17 13h.01M17 17h.01" />
    </Svg>
  );
}

// ---- Block D: service type --------------------------------------------------

export function SwitchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 8h14l-3-3M20 16H6l3 3" />
    </Svg>
  );
}

export function KeyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 9-9M16 7l3 3M14 9l2 2" />
    </Svg>
  );
}

export function UserSwapIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 8h4m0 0-2-2m2 2-2 2" />
    </Svg>
  );
}

export function PlugIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0V7zM12 17v5" />
    </Svg>
  );
}

// ---- Block F: appliances ----------------------------------------------------

export function FridgeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M6 10h12M9 6v1.5M9 13v3" />
    </Svg>
  );
}

export function OvenIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 8h18M6.5 5.5h.01M10 5.5h.01" />
      <rect x="6" y="11" width="12" height="7" rx="1" />
    </Svg>
  );
}

export function DishwasherIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 8h18M7 5.5h.01M11 5.5h.01M8 12h8M9 15h6M10 18h4" />
    </Svg>
  );
}

export function WasherIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="2" width="18" height="20" rx="2" />
      <circle cx="12" cy="14" r="5" />
      <path d="M7 5.5h.01M10.5 5.5h.01M9.5 14c1-1 2-1 3 0s2 1 3 0" />
    </Svg>
  );
}

export function AirConditionerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2" y="4" width="20" height="8" rx="2" />
      <path d="M6 8h12M6 15c0 2 1 3 1 5M12 15c0 2 1 3 1 5M18 15c0 2 1 3 1 5" />
    </Svg>
  );
}

export function WaterHeaterIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="6" y="2" width="12" height="16" rx="5" />
      <path d="M12 7v5M10 12h4M12 18v4M9 22h6" />
    </Svg>
  );
}

// ---- Block F: gas uses ------------------------------------------------------

export function CookingIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 10h16v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-7zM2 10h20M9 6c0-1.5 1-1.5 1-3M14 6c0-1.5 1-1.5 1-3" />
    </Svg>
  );
}

export function RadiatorIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M8 8v8M12 8v8M16 8v8" />
    </Svg>
  );
}

export function DropletIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3s6 6.2 6 11a6 6 0 0 1-12 0c0-4.8 6-11 6-11z" />
    </Svg>
  );
}
