import { DecorSvg, type DecorProps } from "./DecorSvg";

/** The two-part swoosh under the logo mark (solid). 200x48 box. */
export function Swoosh(props: DecorProps) {
  return (
    <DecorSvg viewBox="24 170 200 48" name="swoosh" defaultStroke={0} {...props}>
      <path d="M28 186C70 204 104 208 124 206L116 214C88 214 56 206 28 186Z" fill="currentColor" stroke="none" />
      <path d="M132 205C164 202 194 192 218 174C198 196 168 210 124 214Z" fill="currentColor" stroke="none" />
    </DecorSvg>
  );
}
