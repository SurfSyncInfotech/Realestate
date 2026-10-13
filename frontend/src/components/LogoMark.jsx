import { useId } from "react";

// Estate & Co. mark: a roofline over a monogram "E", in gold on deep green.
export default function LogoMark({ size = 46, className = "" }) {
  const id = useId();
  return (
    <svg className={`logo-mark ${className}`} width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Estate & Co." focusable="false">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1e3bf" />
          <stop offset="0.55" stopColor="#c9a56a" />
          <stop offset="1" stopColor="#9c7a45" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24493d" />
          <stop offset="1" stopColor="#10231b" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="14" fill={`url(#${id}-b)`} />
      <rect x="1.75" y="1.75" width="44.5" height="44.5" rx="13.25" fill="none" stroke={`url(#${id}-g)`} strokeWidth="1.5" />
      <path d="M11.5 20.5 24 10.5l12.5 10" fill="none" stroke={`url(#${id}-g)`} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.5 25.5v11M17.5 25.5h13M17.5 31h10M17.5 36.5h13" fill="none" stroke={`url(#${id}-g)`} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
