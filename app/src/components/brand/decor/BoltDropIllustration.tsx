import { DecorSvg, type DecorProps, LOGO_BOLT } from "./DecorSvg";

/** The drop with the lightning bolt of the logo (luce). Outlined drop + solid bolt. 96x136 box. */
export function BoltDropIllustration(props: DecorProps) {
  return (
    <DecorSvg viewBox="104 64 96 128" name="bolt-drop" defaultStroke={7} {...props}>
      <path d="M152 74C166 100 188 122 188 150A36 36 0 0 1 116 150C116 122 138 100 152 74Z" />
      <path d={LOGO_BOLT} fill="currentColor" stroke="none" />
    </DecorSvg>
  );
}
