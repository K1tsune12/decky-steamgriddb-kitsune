import { ComponentProps, FC, Suspense, lazy } from 'react';

import type MarkdownRenderer from './MarkdownRenderer';

// The markdown parser is a large part of the bundle and only a few modals use it,
// so it's loaded on demand to keep plugin startup light.
const LazyMarkdownRenderer = lazy(() => import('./MarkdownRenderer'));

const Markdown: FC<ComponentProps<typeof MarkdownRenderer>> = (props) => (
  <Suspense fallback={null}>
    <LazyMarkdownRenderer {...props} />
  </Suspense>
);

export default Markdown;
