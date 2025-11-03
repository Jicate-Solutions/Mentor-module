export const SessionsIllustration = ({ className = "w-24 h-24" }: { className?: string }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" r="45" fill="#f0fdf8" />
      <rect x="25" y="30" width="50" height="45" rx="4" fill="#ffffff" stroke="#0b6d41" strokeWidth="2" />
      <rect x="25" y="30" width="50" height="10" fill="#0b6d41" rx="4" />
      <circle cx="35" cy="35" r="2" fill="#ffffff" />
      <circle cx="42" cy="35" r="2" fill="#ffffff" />
      <rect x="35" y="50" width="8" height="8" fill="#ffde59" />
      <rect x="46" y="50" width="8" height="8" fill="#84efc2" />
      <rect x="57" y="50" width="8" height="8" fill="#ffde59" />
      <rect x="35" y="61" width="8" height="8" fill="#84efc2" />
      <rect x="46" y="61" width="8" height="8" fill="#ffde59" />
      <circle cx="80" cy="65" r="8" fill="#ffde59" />
      <path
        d="M76 65 L78 67 L84 61"
        stroke="#0b6d41"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
