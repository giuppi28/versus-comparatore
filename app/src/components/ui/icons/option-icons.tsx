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

// ---- Shared by the activation form (step A / B) -------------------------------

/** Luce / Gas aliases, so call sites read like the domain. */
export const LuceIcon = BoltIcon;
export const GasIcon = FlameIcon;

/** Proprietario: a house with a key. */
export function OwnerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 11 11 4l8 7" />
      <path d="M5 10v9h6" />
      <circle cx="16.5" cy="16.5" r="2.5" />
      <path d="m18.4 18.4 3 3M20.2 20.2l1.3-1.3" />
    </Svg>
  );
}

/** Inquilino: a person next to a door with a key tag. */
export function TenantIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="7.5" r="3.5" />
      <path d="M2 21c0-3.6 2.7-6 6-6s6 2.4 6 6" />
      <rect x="15.5" y="9" width="6" height="12" rx="1" />
      <path d="M19.5 15h.01" />
    </Svg>
  );
}

/** Usufruttuario: a house with a person inside (right of use). */
export function UsufructuaryIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <circle cx="12" cy="12.5" r="2" />
      <path d="M8.5 20c0-2.2 1.5-3.5 3.5-3.5s3.5 1.3 3.5 3.5" />
    </Svg>
  );
}

/** Altro: three dots. */
export function OtherIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M8 12h.01M12 12h.01M16 12h.01" strokeWidth={2.6} />
    </Svg>
  );
}

/** Sì: check in a circle. */
export function YesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="m7.8 12.4 3 3 5.4-6" />
    </Svg>
  );
}

/** No: cross in a circle. */
export function NoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </Svg>
  );
}

/** Residente: a map pin with a house inside. */
export function ResidentIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 22s7-6.1 7-12a7 7 0 0 0-14 0c0 5.9 7 12 7 12z" />
      <path d="m9 10.5 3-2.5 3 2.5M9.8 10.2V13h4.4v-2.8" />
    </Svg>
  );
}

/** 220 V monofase: socket with a single bolt. */
export function SinglePhaseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M12.8 7 9 12.5h3L11.2 17l3.8-5.5h-3z" />
    </Svg>
  );
}

/** 380 V trifase: three phase lines on a socket. */
export function ThreePhaseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M8 8v5M12 8v8M16 8v5" />
      <path d="M6.5 16.5h.01M17.5 16.5h.01" />
    </Svg>
  );
}

/** Potenza: a gauge. */
export function GaugeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 17a9 9 0 1 1 17 0" />
      <path d="m12 14 4-5" />
      <circle cx="12" cy="14.5" r="1.4" />
      <path d="M6 12.5h.01M8.2 8.8h.01M12 7.5h.01M15.8 8.8h.01" />
    </Svg>
  );
}

/** Comune: a town hall with a flag. */
export function CityIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 21h18M5 21V11l7-4 7 4v10" />
      <path d="M12 7V2.5l3 1.2-3 1.2" />
      <path d="M9 21v-5h6v5M9 12.5h.01M15 12.5h.01" />
    </Svg>
  );
}

/** Indirizzo: a map pin. */
export function AddressIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 22s7-6.1 7-12a7 7 0 0 0-14 0c0 5.9 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </Svg>
  );
}
