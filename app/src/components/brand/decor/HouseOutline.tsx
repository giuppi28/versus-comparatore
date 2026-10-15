import { DecorSvg, type DecorProps } from "./DecorSvg";

/** The roof-and-chimney outline of the logo house (mitered like the original). 240x180 box. */
export function HouseOutline(props: DecorProps) {
  return (
    <DecorSvg viewBox="20 24 200 140" name="house" defaultStroke={14} {...props}>
      <polyline points="40,150 40,102 120,40 200,102 200,150" strokeLinejoin="miter" strokeLinecap="butt" />
      <rect x="166" y="46" width="16" height="38" fill="currentColor" stroke="none" />
    </DecorSvg>
  );
}
