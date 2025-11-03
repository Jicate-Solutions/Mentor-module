export const FeedbackIllustration = ({ className = "w-24 h-24" }: { className?: string }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" r="45" fill="#fffef0" />
      <path
        d="M25 40 C25 35, 30 30, 35 30 L65 30 C70 30, 75 35, 75 40 L75 60 C75 65, 70 70, 65 70 L40 70 L25 80 L25 40 Z"
        fill="#ffde59"
      />
      <circle cx="40" cy="50" r="3" fill="#0b6d41" />
      <circle cx="50" cy="50" r="3" fill="#0b6d41" />
      <circle cx="60" cy="50" r="3" fill="#0b6d41" />
      <path
        d="M78 55 L83 60 L88 50"
        stroke="#0b6d41"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="30" r="4" fill="#84efc2" />
      <circle cx="85" cy="35" r="3" fill="#48dfa0" opacity="0.6" />
    </svg>
  );
};
