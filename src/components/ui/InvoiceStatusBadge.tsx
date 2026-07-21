import Badge from '@/components/ui/Badge';

/**
 * Colour tokens for both the computed list status (Paid/Overdue/Pending) and
 * the lifecycle status (Draft/Sent/Viewed/Partially Paid/Cancelled), matching
 * the web getStatusStyle / statusStyle maps.
 */
const STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  Paid: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  Overdue: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  Pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  Draft: { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
  Sent: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  Viewed: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  'Partially Paid': { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  Cancelled: { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
};

export default function InvoiceStatusBadge({
  status,
  dot = true,
}: {
  status?: string;
  dot?: boolean;
}) {
  const s = STYLES[status ?? ''] ?? {
    bg: 'bg-slate-200',
    text: 'text-slate-700',
    dot: 'bg-slate-400',
  };
  return (
    <Badge
      label={status ?? 'Unknown'}
      bg={s.bg}
      text={s.text}
      dot={dot ? s.dot : undefined}
    />
  );
}
