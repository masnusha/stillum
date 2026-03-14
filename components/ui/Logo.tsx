export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      width="1024"
      height="1024"
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clipPath="url(#clip0_11_21)">
        <rect width="1024" height="1024" rx="180" fill="#0E1A2B" />
        <g opacity="0.45" style={{ mixBlendMode: "overlay" }}>
          <rect width="1024" height="1024" rx="200" fill="url(#paint0_radial_11_21)" />
        </g>
        <g opacity="0.18" filter="url(#filter0_f_11_21)" style={{ mixBlendMode: "screen" }}>
          <rect x="692" y="83" width="110" height="950" fill="url(#paint1_linear_11_21)" />
        </g>
        <g opacity="0.65" filter="url(#filter1_f_11_21)" style={{ mixBlendMode: "screen" }}>
          <rect x="729" y="83" width="36" height="950" fill="url(#paint2_linear_11_21)" />
        </g>
        <rect opacity="0.9" x="743" y="83" width="9" height="950" fill="url(#paint3_linear_11_21)" />
      </g>
      <defs>
        <filter
          id="filter0_f_11_21"
          x="522"
          y="-87"
          width="450"
          height="1290"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="85" result="effect1_foregroundBlur_11_21" />
        </filter>
        <filter
          id="filter1_f_11_21"
          x="674"
          y="28"
          width="146"
          height="1060"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="27.5" result="effect1_foregroundBlur_11_21" />
        </filter>
        <radialGradient
          id="paint0_radial_11_21"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(743 342.5) rotate(91.5016) scale(515.177)"
        >
          <stop stopColor="#0F2748" />
          <stop offset="1" stopColor="#071321" />
        </radialGradient>
        <linearGradient
          id="paint1_linear_11_21"
          x1="747"
          y1="83"
          x2="747"
          y2="1033"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F2F1ED" stopOpacity="0" />
          <stop offset="0.5" stopColor="#F2F1ED" />
          <stop offset="1" stopColor="#F2F1ED" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id="paint2_linear_11_21"
          x1="747"
          y1="83"
          x2="747"
          y2="1033"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F2F1ED" stopOpacity="0" />
          <stop offset="0.5" stopColor="#F2F1ED" />
          <stop offset="1" stopColor="#F2F1ED" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id="paint3_linear_11_21"
          x1="747.5"
          y1="83"
          x2="747.5"
          y2="1033"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F2F2F2" stopOpacity="0" />
          <stop offset="0.5" stopColor="#F2F2F2" />
          <stop offset="1" stopColor="#F2F2F2" stopOpacity="0" />
        </linearGradient>
        <clipPath id="clip0_11_21">
          <rect width="1024" height="1024" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
