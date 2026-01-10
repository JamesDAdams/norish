"use client";

import { useTranslations } from "next-intl";

import ImageCarousel, { type CarouselImage } from "@/components/shared/image-carousel";

type MediaViewerProps = {
  videoFilename?: string | null;
  images: CarouselImage[];
  recipeName: string;
  className?: string;
  rounded?: boolean;
  aspectRatio?: "video" | "square" | "4/3";
  showVideo?: boolean;
};

export default function MediaViewer({
  videoFilename,
  images,
  recipeName,
  className = "",
  rounded = true,
  aspectRatio = "video",
  showVideo = false,
}: MediaViewerProps) {
  const t = useTranslations("recipes.detail");

  const hasVideo = Boolean(videoFilename);

  // Map aspectRatio to CSS style
  const aspectRatioStyle = {
    video: "16 / 9",
    square: "1 / 1",
    "4/3": "4 / 3",
  }[aspectRatio];

  // If no video, just show images
  if (!hasVideo) {
    return (
      <ImageCarousel
        aspectRatio={aspectRatio}
        className={className}
        images={images}
        recipeName={recipeName}
        rounded={rounded}
      />
    );
  }

  // If video exists and showVideo is true, display video; otherwise show images
  return showVideo ? (
    // Video view
    <div className={`relative ${className}`}>
      <video
        controls
        className={`h-full w-full object-cover ${rounded ? "rounded-2xl" : ""}`}
        preload="metadata"
        style={{ aspectRatio: aspectRatioStyle }}
      >
        <source src={`/recipes/videos/${videoFilename}`} type="video/mp4" />
        {t("videoNotSupported", { defaultValue: "Your browser does not support the video tag." })}
      </video>
    </div>
  ) : (
    // Image view
    <ImageCarousel
      aspectRatio={aspectRatio}
      className={className}
      images={images}
      recipeName={recipeName}
      rounded={rounded}
    />
  );
}
