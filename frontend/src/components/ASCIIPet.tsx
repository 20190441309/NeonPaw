"use client";
interface Props {
  frame: string;
}

export default function ASCIIPet({ frame }: Props) {
  return (
    <pre className="text-xs leading-tight whitespace-pre overflow-x-auto text-center glow">
      {frame}
    </pre>
  );
}
