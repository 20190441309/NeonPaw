"use client";
interface Props {
  frame: string;
}

export default function ASCIIPet({ frame }: Props) {
  return (
    <pre className="text-[10px] sm:text-xs leading-tight whitespace-pre overflow-x-auto text-center glow terminal-scroll">
      {frame}
    </pre>
  );
}
