import { DecorSvg, type DecorProps, LOGO_BOLT } from "./DecorSvg";

export interface BulbIllustrationProps extends DecorProps {
  /** Short rays around the glass. */
  rays?: boolean;
  /** The logo bolt inside the glass. */
  bolt?: boolean;
}

/** Light bulb (= luce) drawn like the logo: bold outline, solid bolt from the drop. 200x260 box. */
export function BulbIllustration({ rays = true, bolt = true, ...props }: BulbIllustrationProps) {
  return (
    <DecorSvg viewBox="0 0 200 260" name="bulb" defaultStroke={10} {...props}>
      {/* glass */}
      <path d="M72 188c0-26-32-42-32-92a60 60 0 0 1 120 0c0 50-32 66-32 92z" />
      {/* screw base */}
      <path d="M74 208h52M80 226h40M90 244h20" />
      {bolt && (
        <path
          d={LOGO_BOLT}
          fill="currentColor"
          stroke="none"
          transform="translate(-68 -64) scale(1.1)"
        />
      )}
      {rays && <path d="M100 18V6M46 42 36 32M154 42l10-10M24 96H8M176 96h16" />}
    </DecorSvg>
  );
}
