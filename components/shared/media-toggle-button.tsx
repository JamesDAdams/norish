"use client";

import { PlayIcon, PhotoIcon } from "@heroicons/react/24/solid";
import { useCallback } from "react";
import { ICON_SIZE_CLASSES } from "../../types/icon-sizes";

type MediaToggleButtonProps = {
  showVideo: boolean;
  onToggle: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  showBackground?: boolean;
};

export default function MediaToggleButton({
  showVideo,
  onToggle,
  size = "md",
  className = "",
  showBackground = false,
}: MediaToggleButtonProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onToggle();
    },
    [onToggle]
  );

  const iconSize = ICON_SIZE_CLASSES[size];

  return (
    <button
      aria-label={showVideo ? "Show images" : "Play video"}
      aria-pressed={showVideo}
      className={`group relative inline-flex items-center justify-center transition-all duration-300 ${showBackground ? "rounded-full bg-black/30 p-1.5 backdrop-blur-sm" : ""} scale-90 opacity-70 hover:scale-100 hover:opacity-100 ${className}`}
      type="button"
      onClick={handleClick}
    >
      {showVideo ? (
        <PhotoIcon className={`${iconSize} text-white transition-colors duration-300`} />
      ) : (
        <PlayIcon className={`${iconSize} text-white transition-colors duration-300`} />
      )}
    </button>
  );
}
