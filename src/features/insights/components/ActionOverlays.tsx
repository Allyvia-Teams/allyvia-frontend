// Renders the screen a prefill flow is waiting on (owner trust T16): the price review or the draft orders made.
// The controller hook (useRecommendationCards) holds it; closing a screen resolves the flow that opened it.

import { useNavigate } from 'react-router-dom';

import type { ActionOverlay } from '../actionOverlay';
import DraftOrdersDialog from './DraftOrdersDialog';
import MarkdownReviewDialog from './MarkdownReviewDialog';

export default function ActionOverlays({ overlay }: { overlay: ActionOverlay | null }) {
  const navigate = useNavigate();
  if (!overlay) return null;
  if (overlay.kind === 'markdown') {
    return <MarkdownReviewDialog action={overlay.action} apply={overlay.apply} onClose={overlay.resolve} />;
  }
  return (
    <DraftOrdersDialog
      summary={overlay.summary}
      onOpen={(route) => {
        overlay.resolve();
        navigate(route);
      }}
      onClose={overlay.resolve}
    />
  );
}
