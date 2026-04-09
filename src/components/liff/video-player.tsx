"use client";

import { useState, useEffect } from "react";

type VideoPlayerProps = {
  src: string;
};

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?#]+)/
  );
  return match?.[1] || null;
}

export function VideoPlayer({ src }: VideoPlayerProps) {
  const [mounted, setMounted] = useState(false);
  const videoId = extractYouTubeId(src);

  useEffect(() => { setMounted(true); }, []);

  if (!videoId || !mounted) return null;

  return (
    <div className="w-full rounded-2xl overflow-hidden aspect-video">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?rel=0&playsinline=1&modestbranding=1`}
        className="w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
}
