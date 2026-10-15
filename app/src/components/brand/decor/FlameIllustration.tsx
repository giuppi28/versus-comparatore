import { DecorSvg, type DecorProps } from "./DecorSvg";

/** The big flame of the logo (gas): outlined body + solid inner flame. 100x120 box. */
export function FlameIllustration(props: DecorProps) {
  return (
    <DecorSvg viewBox="-8 -8 116 136" name="flame" defaultStroke={7} {...props}>
      <path d="M50 0C62 28 92 46 92 78C92 102 73 120 50 120C27 120 8 102 8 78C8 56 24 44 30 26C36 38 40 44 46 46C48 30 46 14 50 0Z" />
      <path
        d="M50 58C58 74 70 84 70 98C70 110 61 117 50 117C39 117 30 110 30 98C30 86 42 76 50 58Z"
        fill="currentColor"
        stroke="none"
      />
    </DecorSvg>
  );
}
