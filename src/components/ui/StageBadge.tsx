import Badge from '@/components/ui/Badge';
import { STAGE_STYLES } from '@/services/opportunities';

/** Opportunity stage pill using the per-stage colour tokens. */
export default function StageBadge({ stage }: { stage?: string }) {
  const token = STAGE_STYLES[stage ?? ''] ?? 'bg-slate-100 text-slate-600';
  const [bg, text] = token.split(' ');
  return <Badge label={stage ?? 'Unknown'} bg={bg} text={text} />;
}
