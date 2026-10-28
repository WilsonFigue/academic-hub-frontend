/** Marca de Academic Hub: una "A" que también es un camino ascendente. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill="var(--color-accent)" />
      <path d="M9 21.5 16 9l7 12.5M11.6 17h8.8" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <LogoMark size={size} />
      <span style={{ fontWeight: 700, fontSize: size >= 36 ? '1.25rem' : '1.0625rem', letterSpacing: '-0.02em', color: 'var(--color-ink)' }}>
        Academic Hub
      </span>
    </span>
  );
}
