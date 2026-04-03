type Props = {
  size?: number;
  className?: string;
};

export default function GymFlowLogo({ size = 32, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="GymFlow logo"
      role="img"
    >
      {/* Red background */}
      <rect width="48" height="48" fill="#e63946" />

      {/* "G" — open-right shape: top bar, left stem, bottom bar + right stem from bottom to mid, crossbar */}
      {/* Left stem */}
      <rect x="5" y="11" width="4.5" height="26" fill="white" />
      {/* Top bar */}
      <rect x="5" y="11" width="13" height="4.5" fill="white" />
      {/* Bottom bar */}
      <rect x="5" y="32.5" width="13" height="4.5" fill="white" />
      {/* Right stem — only bottom half */}
      <rect x="13.5" y="24" width="4.5" height="13" fill="white" />

      {/* "F" */}
      {/* Left stem */}
      <rect x="24" y="11" width="4.5" height="26" fill="white" />
      {/* Top bar */}
      <rect x="24" y="11" width="13" height="4.5" fill="white" />
      {/* Middle bar */}
      <rect x="24" y="22" width="11" height="4.5" fill="white" />

      {/* Pulse/heartbeat ECG line */}
      <polyline
        points="0,25.5 13,25.5 16,16 19.5,36 23,20 26,30 29,25.5 48,25.5"
        stroke="#e63946"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="0,25.5 13,25.5 16,16 19.5,36 23,20 26,30 29,25.5 48,25.5"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
