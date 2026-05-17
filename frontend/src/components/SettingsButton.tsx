// frontend/src/components/SettingsButton.tsx
"use client";

interface Props {
  onClick: () => void;
}

export default function SettingsButton({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="opacity-40 hover:opacity-80 transition-opacity text-sm leading-none"
      title="Settings"
    >
      ⚙
    </button>
  );
}
