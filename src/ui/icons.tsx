/** Line icons of the prototype. Decorative: the button carries the label. */
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  'aria-hidden': true
};

export function TrashIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" strokeWidth="1.8" {...stroke}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" {...stroke}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="1.8" {...stroke}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeClosedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="1.8" {...stroke}>
      <path d="M3 3l18 18M10.6 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.1 4M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.9 9.9 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export function HandleIcon() {
  return (
    <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor" aria-hidden="true">
      <circle cx="4" cy="4" r="1.6" />
      <circle cx="10" cy="4" r="1.6" />
      <circle cx="4" cy="9" r="1.6" />
      <circle cx="10" cy="9" r="1.6" />
      <circle cx="4" cy="14" r="1.6" />
      <circle cx="10" cy="14" r="1.6" />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

export function RevealIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="2.2" {...stroke}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}

export function HideIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="2.2" {...stroke}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

export function TakeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="1.9" {...stroke}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

export function PaletteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3a9 9 0 0 0 0 18c1.4 0 2-1 2-2s-1-1.6-1-2.6 .8-1.4 2-1.4h2a4 4 0 0 0 4-4c0-4.4-4-8-9-8Z" />
      <circle cx="7.5" cy="11" r="1.2" fill="currentColor" />
      <circle cx="10.5" cy="7" r="1.2" fill="currentColor" />
      <circle cx="15" cy="7.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function HelpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="1.9" {...stroke}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.2-2.5 3.8" />
      <circle cx="12" cy="17" r=".6" fill="currentColor" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" {...stroke}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinejoin="round" {...stroke}>
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}

export function PinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="1.9" strokeLinejoin="round" {...stroke}>
      <path d="M9 4h6l-1 5 3 3v2H7v-2l3-3-1-5Z" />
      <path d="M12 14v6" />
    </svg>
  );
}

export function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" strokeWidth="2.4" {...stroke}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function AlertIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5v.01" />
    </svg>
  );
}
