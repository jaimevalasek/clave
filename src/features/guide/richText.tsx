import { Fragment } from 'react';
import type { ReactNode } from 'react';

/**
 * A cópia do guia marca ênfase com `<span class="termo">` e teclas com
 * `<span class="tecla">`, do jeito que o protótipo aprovado escrevia. Aqui o
 * texto vira nó React de verdade em vez de `dangerouslySetInnerHTML`: a camada
 * didática nunca injeta HTML, nem vindo de constante do próprio repositório.
 */
const MARKUP = /<span class="(termo|tecla)">(.*?)<\/span>/g;

export function richText(source: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of source.matchAll(MARKUP)) {
    const [full, className, content] = match;
    const start = match.index ?? 0;
    if (start > cursor) nodes.push(source.slice(cursor, start));
    nodes.push(
      <span className={className} key={`${className}-${start}`}>
        {content}
      </span>
    );
    cursor = start + full.length;
  }

  if (cursor < source.length) nodes.push(source.slice(cursor));
  return nodes.map((node, index) => <Fragment key={index}>{node}</Fragment>);
}
