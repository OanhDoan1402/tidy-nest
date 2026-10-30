export default function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      <rect width="36" height="36" rx="10" fill="#1E6B57" />
      <path d="M9 18.5 18 11l9 7.5V27H9z" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 21.5h8" stroke="#F0B43C" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
