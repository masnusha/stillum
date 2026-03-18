"use client";

import * as Popover from "@radix-ui/react-popover";

const EMOJIS = [
  "🔥", "❤️", "🦇", "🧊", "💀",
  "😭", "🙏", "✨", "💔", "👽",
  "💯", "💸", "🏆", "💣", "🩸",
  "💊", "🎭", "🎧", "🖤", "🤍",
];

interface Props {
  trigger:  React.ReactNode;
  onSelect: (emoji: string) => void;
  open:     boolean;
  onOpenChange: (v: boolean) => void;
}

export default function EmojiGrid({ trigger, onSelect, open, onOpenChange }: Props) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="top"
          align="end"
          sideOffset={10}
          collisionPadding={16}
          className="w-[244px] p-2.5
                     bg-[#0A0D16]/97 backdrop-blur-xl
                     border border-white/[0.08] rounded-2xl shadow-2xl
                     z-[400] outline-none
                     data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95
                     data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
                     data-[side=top]:slide-in-from-bottom-2
                     duration-150"
        >
          <div className="grid grid-cols-5 gap-1">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => { onSelect(emoji); onOpenChange(false); }}
                className="flex items-center justify-center text-[22px]
                           w-full aspect-square rounded-xl
                           hover:bg-white/[0.08] active:bg-white/[0.14] active:scale-90
                           transition-all duration-100 select-none cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
