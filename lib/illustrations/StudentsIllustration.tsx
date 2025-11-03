export const StudentsIllustration = ({ className = "w-24 h-24" }: { className?: string }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" r="45" fill="#fffef0" />
      <rect x="30" y="40" width="40" height="30" rx="3" fill="#ffde59" />
      <rect x="35" y="45" width="30" height="3" fill="#ffffff" />
      <rect x="35" y="52" width="25" height="3" fill="#ffffff" />
      <rect x="35" y="59" width="20" height="3" fill="#ffffff" />
      <path
        d="M50 30 L65 40 L35 40 Z"
        fill="#0b6d41"
      />
      <circle cx="70" cy="30" r="6" fill="#84efc2" />
      <circle cx="25" cy="60" r="4" fill="#48dfa0" />
      <circle cx="80" cy="70" r="5" fill="#f5c700" opacity="0.6" />
      <rect x="42" y="35" width="16" height="2" fill="#0b6d41" />
    </svg>
  );
};
