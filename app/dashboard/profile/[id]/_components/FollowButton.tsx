"use client";

import { useState, useTransition } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { followUser, unfollowUser } from "@/app/actions/follow";

interface Props {
  targetId:    string;
  isFollowing: boolean;
}

export default function FollowButton({ targetId, isFollowing: initial }: Props) {
  const [following,  setFollowing]  = useState(initial);
  const [isPending,  startTransition] = useTransition();

  function toggle() {
    const next = !following;
    setFollowing(next); // optimistic update
    startTransition(async () => {
      try {
        if (next) await followUser(targetId);
        else      await unfollowUser(targetId);
      } catch {
        setFollowing(!next); // revert on error
      }
    });
  }

  const isUnfollowHover = following; // shows red hint on hover when already following

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className={[
        "rounded-full border transition-all px-6 py-2 text-sm font-semibold flex items-center gap-2 h-9",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        isUnfollowHover
          ? "border-white/20 bg-white/10 text-white/60 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
          : "border-white/20 bg-white/[0.05] text-white hover:bg-white/10",
      ].join(" ")}
    >
      {following ? (
        <>
          <UserCheck className="w-3.5 h-3.5 shrink-0" />
          Вы подписаны
        </>
      ) : (
        <>
          <UserPlus className="w-3.5 h-3.5 shrink-0" />
          Подписаться
        </>
      )}
    </button>
  );
}
