import React from "react";

interface LogoProps {
  src: string | null | undefined;
  alt: string;
  size?: 10 | 12 | 14 | 16 | 20; // constrained to known Tailwind classes
  rounded?: boolean;
  className?: string;
  variant?: 'default' | 'offer' | 'bonkback'; // offer variant for cashback offers, bonkback for BonkBack logo
}

// A reusable logo renderer that ensures no cropping or distortion.
// - Centers the logo inside a square container
// - Uses object-contain to avoid cropping
// - Adds subtle padding and a theme-aware background for contrast
// - Lazy loads images and uses async decoding
export function Logo({ src, alt, size = 12, rounded = true, className = "", variant = 'default' }: LogoProps) {
  const sizeMap: Record<NonNullable<LogoProps["size"]>, string> = {
    10: "w-10 h-10",
    12: "w-12 h-12",
    14: "w-14 h-14",
    16: "w-16 h-16",
    20: "w-20 h-20",
  };
  const sizeClass = sizeMap[size] || "w-12 h-12";

  // Different background styles based on variant
  const backgroundClass = variant === 'offer' 
    ? 'bg-white dark:bg-white' // White background for offer logos in both modes
    : variant === 'bonkback'
    ? '' // No background class for bonkback, will use inline style
    : 'bg-background'; // Theme-aware background for default logos

  const backgroundStyle = variant === 'bonkback' ? { backgroundColor: '#fc9d1f' } : undefined;

  if (!src) {
    return (
      <div
        className={`${sizeClass} ${rounded ? "rounded-lg" : "rounded"} border border-border flex items-center justify-center ${backgroundClass} shadow-sm ${className}`}
        style={backgroundStyle}
        aria-label={`${alt} logo placeholder`}
      >
        <span className={`text-xs font-medium ${variant === 'offer' ? 'text-gray-600' : variant === 'bonkback' ? 'text-white' : 'text-muted-foreground'}`}>
          {alt.charAt(0)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} ${rounded ? "rounded-lg" : "rounded"} border border-border flex items-center justify-center overflow-hidden ${backgroundClass} shadow-sm ${className}`}
      style={backgroundStyle}
      aria-label={`${alt} logo container`}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-contain p-1"
        crossOrigin="anonymous"
      />
    </div>
  );
}

export default Logo;
