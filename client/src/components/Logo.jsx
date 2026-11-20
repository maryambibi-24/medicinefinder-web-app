// MedFinder logo: a map pin with a capsule inside
export default function Logo({ size = 44, showName = true }) {
  return (
    <div className="logo">
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <rect width="40" height="40" rx="11" fill="#fff" />
        <path
          d="M20 5.5c-5.2 0-9.5 4-9.5 9.2 0 6.7 9.5 17.8 9.5 17.8s9.5-11.1 9.5-17.8C29.5 9.5 25.2 5.5 20 5.5z"
          fill="#1d4ed8"
        />
        <g transform="rotate(-45 20 14.7)">
          <path d="M20 11.7h-3a3 3 0 0 0 0 6h3z" fill="#fff" />
          <path d="M20 11.7h3a3 3 0 0 1 0 6h-3z" fill="#7dd3fc" />
        </g>
      </svg>
      {showName && <span className="logo-name">MedFinder</span>}
    </div>
  );
}
