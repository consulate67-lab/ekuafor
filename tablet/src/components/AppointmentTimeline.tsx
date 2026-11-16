import type { TimelineSegment } from '../lib/processingWindows';

type Props = {
  segments: TimelineSegment[];
  /** Kart içinde kompakt satır */
  compact?: boolean;
  /** Tamamlandı / koyu zemin */
  inverted?: boolean;
};

export function AppointmentTimeline({ segments, compact, inverted }: Props) {
  if (!segments.length) return null;
  if (segments.length === 1 && segments[0].kind === 'work') {
    const s = segments[0];
    return (
      <div className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-bold ${inverted ? 'opacity-80' : 'opacity-70'}`}>
        <span className="font-black">Saat devamı</span>{' '}
        <span className="tabular-nums">
          {s.start}→{s.end}
        </span>
      </div>
    );
  }

  return (
    <ul className={`space-y-0.5 ${compact ? 'text-[9px] leading-tight' : 'text-[10px] leading-snug'} ${inverted ? 'opacity-80' : 'opacity-75'}`}>
      {segments.map(seg => (
        <li key={`${seg.kind}-${seg.start}`} className="flex flex-wrap items-baseline gap-x-1">
          <span
            className={`font-black ${
              seg.kind === 'wait'
                ? inverted
                  ? 'text-amber-200'
                  : 'text-amber-800'
                : seg.kind === 'continue'
                  ? inverted
                    ? 'text-sky-100'
                    : 'text-sky-800'
                  : ''
            }`}
          >
            {seg.label}
          </span>
          <span className="font-bold tabular-nums">
            {seg.start}–{seg.end}
          </span>
        </li>
      ))}
    </ul>
  );
}
