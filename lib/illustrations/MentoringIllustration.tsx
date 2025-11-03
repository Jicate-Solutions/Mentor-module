export const MentoringIllustration = ({ className = "w-24 h-24" }: { className?: string }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" r="45" fill="#f0fdf8" />
      <circle cx="50" cy="35" r="12" fill="#0b6d41" />
      <path
        d="M30 60 C30 50, 50 50, 50 50 C50 50, 70 50, 70 60 L70 75 C70 80, 65 85, 60 85 L40 85 C35 85, 30 80, 30 75 Z"
        fill="#0b6d41"
      />
      <circle cx="65" cy="65" r="8" fill="#ffde59" />
      <path
        d="M65 57 L65 50 M62 54 L65 57 L68 54"
        stroke="#0a5a36"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="35" cy="45" r="4" fill="#84efc2" />
      <circle cx="75" cy="40" r="3" fill="#ffde59" opacity="0.6" />
    </svg>
  );
};
