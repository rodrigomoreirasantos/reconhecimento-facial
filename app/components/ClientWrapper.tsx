"use client";

import dynamic from "next/dynamic";

const FaceRecognition = dynamic(() => import("./FaceRecognition"), {
  ssr: false,
});

export default function ClientWrapper() {
  return <FaceRecognition />;
}
