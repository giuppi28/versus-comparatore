import type { ReactNode } from "react";

/**
 * Renders `**bold**` markdown (and nothing else) as React nodes.
 * Everything is emitted as React text children, so HTML in the input is escaped
 * by React and never interpreted. Unmatched `**` stay literal.
 */
export function renderBold(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\*\*([^*]+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    nodes.push(<strong key={match.index}>{match[1]}</strong>);
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
