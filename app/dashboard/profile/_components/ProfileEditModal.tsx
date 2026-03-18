"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Check, Loader2, Lock, Sparkles, Trash2 } from "lucide-react";
import { TelegramIcon, VkIcon, FilledMusicIcon, FilledGlobeIcon } from "./SocialIcons";
import {
  updateProfile,
  getAvatarPresignedUrl,
  updateUserAvatar,
  getBannerPresignedUrl,
  updateUserBanner,
  removeUserBanner,
} from "@/app/actions/user";
import ImageCropperModal    from "@/components/modals/ImageCropperModal";
import UserNameWithBadges   from "@/components/ui/UserNameWithBadges";
import type { UserProfile } from "./ProfileClient";

// ─── Constants ────────────────────────────────────────────────────────────────

const EMOJI_PALETTE = [
  "🦇","🎧","✨","🌑","🌊","🪐","🕯️","🥀",
  "🎹","💎","🕊️","🎬","🌪️","🖤","⚡","🏹",
  "🧿","☁️","🧊","💿",
];

// ─── SocialInput ──────────────────────────────────────────────────────────────

function SocialInput({
  icon, placeholder, value, onChange,
}: {
  icon:        React.ReactNode;
  placeholder: string;
  value:       string;
  onChange:    (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 focus-within:border-white/20 transition-colors">
      <span className="shrink-0 text-white/30">{icon}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-sm text-white/80 placeholder:text-white/20 min-w-0"
      />
    </div>
  );
}

// ─── EmojiPicker ─────────────────────────────────────────────────────────────

function EmojiPicker({
  current,
  onSelect,
  onClear,
  onClose,
}: {
  current:  string | null;
  onSelect: (e: string) => void;
  onClear:  () => void;
  onClose:  () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -6 }}
      animate={{ opacity: 1, scale: 1,    y: 0  }}
      exit={{    opacity: 0, scale: 0.95, y: -6  }}
      transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute left-0 top-[calc(100%+8px)] z-20 w-[264px] bg-[#111114] border border-white/10 rounded-2xl shadow-2xl p-3"
    >
      <div className="grid grid-cols-5 gap-1 mb-3">
        {EMOJI_PALETTE.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => { onSelect(emoji); onClose(); }}
            className={`text-2xl flex items-center justify-center w-10 h-10 rounded-xl transition-all hover:scale-125 hover:bg-white/[0.06] ${
              current === emoji ? "bg-white/[0.08] ring-1 ring-white/20" : ""
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Clear */}
      <button
        type="button"
        onClick={() => { onClear(); onClose(); }}
        className="w-full py-1.5 rounded-lg text-[12px] text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
      >
        Убрать статус
      </button>
    </motion.div>
  );
}

// ─── ProfileEditModal ─────────────────────────────────────────────────────────

interface Props {
  user:    UserProfile;
  onClose: () => void;
  onSaved: (updated: Partial<UserProfile>) => void;
}

export default function ProfileEditModal({ user, onClose, onSaved }: Props) {
  const isPlus          = user.plan === "PLUS";
  const canChangeBanner = user.plan === "PLUS" || user.role === "ARTIST";

  // Form fields
  const [username,        setUsername]        = useState(user.username        ?? "");
  const [bio,             setBio]             = useState(user.bio             ?? "");
  const [telegramLink,    setTelegramLink]    = useState(user.telegramLink    ?? "");
  const [vkLink,          setVkLink]          = useState(user.vkLink          ?? "");
  const [yandexMusicLink, setYandexMusicLink] = useState(user.yandexMusicLink ?? "");
  const [customLink,      setCustomLink]      = useState(user.customLink      ?? "");
  const [statusEmoji,     setStatusEmoji]     = useState<string | null>(user.statusEmoji ?? null);

  // Emoji picker visibility
  const [pickerOpen,   setPickerOpen]   = useState(false);
  const [plusTooltip,  setPlusTooltip]  = useState(false);

  // Cropped files
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  // Live previews
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Banner removal flag (deferred — applied on save)
  const [bannerRemoved, setBannerRemoved] = useState(false);

  // Crop modal state
  const [cropTarget, setCropTarget] = useState<"avatar" | "banner" | null>(null);
  const [cropSrc,    setCropSrc]    = useState<string | null>(null);

  // Save state
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const { update: updateSession } = useSession();

  const displayedAvatar = avatarPreview ?? user.avatarUrl;
  const displayedBanner = bannerRemoved ? null : (bannerPreview ?? user.bannerUrl);
  const displayName     = username || user.name || user.email;

  const initials = displayName
    .split(" ")
    .map((w) => w[0] ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  // ── File pick → cropper ───────────────────────────────────────────────────

  function handleFilePick(file: File, target: "avatar" | "banner") {
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setCropTarget(target);
    if (target === "avatar" && avatarInputRef.current) avatarInputRef.current.value = "";
    if (target === "banner" && bannerInputRef.current) bannerInputRef.current.value = "";
  }

  function handleApplyCrop(file: File) {
    if (!cropTarget) return;
    const url = URL.createObjectURL(file);
    if (cropTarget === "avatar") {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarFile(file);
      setAvatarPreview(url);
    } else {
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
      setBannerFile(file);
      setBannerPreview(url);
    }
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setCropTarget(null);
  }

  function handleCancelCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setCropTarget(null);
  }

  function handleRemoveBanner() {
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerFile(null);
    setBannerPreview(null);
    setBannerRemoved(true);
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      if (avatarFile) {
        const res = await getAvatarPresignedUrl(avatarFile.type || "image/jpeg", avatarFile.size);
        if ("error" in res) { setError(res.error); setSaving(false); return; }
        const up = await fetch(res.presignedUrl, {
          method: "PUT", body: avatarFile,
          headers: { "Content-Type": avatarFile.type || "image/jpeg" },
        });
        if (!up.ok) { setError("Ошибка загрузки аватарки."); setSaving(false); return; }
        const save = await updateUserAvatar(res.fileKey);
        if (save.error) { setError(save.error); setSaving(false); return; }
      }

      if (bannerRemoved && !bannerFile) {
        const save = await removeUserBanner();
        if (save.error) { setError(save.error); setSaving(false); return; }
      } else if (bannerFile) {
        const res = await getBannerPresignedUrl(bannerFile.type || "image/jpeg", bannerFile.size);
        if ("error" in res) { setError(res.error); setSaving(false); return; }
        const up = await fetch(res.presignedUrl, {
          method: "PUT", body: bannerFile,
          headers: { "Content-Type": bannerFile.type || "image/jpeg" },
        });
        if (!up.ok) { setError("Ошибка загрузки фона."); setSaving(false); return; }
        const save = await updateUserBanner(res.fileKey);
        if (save.error) { setError(save.error); setSaving(false); return; }
      }

      const result = await updateProfile({
        username, bio, telegramLink, vkLink, yandexMusicLink, customLink,
        statusEmoji: isPlus ? statusEmoji : null,
      });
      if (result.error) { setError(result.error); setSaving(false); return; }

      onSaved({
        username:        username        || null,
        bio:             bio             || null,
        avatarUrl:       avatarPreview   ?? user.avatarUrl,
        bannerUrl:       bannerRemoved ? null : (bannerPreview ?? user.bannerUrl),
        telegramLink:    telegramLink    || null,
        vkLink:          vkLink          || null,
        yandexMusicLink: yandexMusicLink || null,
        customLink:      customLink      || null,
        statusEmoji:     isPlus ? statusEmoji : user.statusEmoji,
      });
      await updateSession();
      setSuccess(true);
      setTimeout(onClose, 600);
    } catch {
      setError("Неожиданная ошибка. Попробуйте снова.");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Crop modal */}
      <AnimatePresence>
        {cropSrc && cropTarget && (
          <ImageCropperModal
            src={cropSrc}
            aspect={cropTarget === "avatar" ? 1 : 3}
            cropShape={cropTarget === "avatar" ? "round" : "rect"}
            onApply={handleApplyCrop}
            onCancel={handleCancelCrop}
          />
        )}
      </AnimatePresence>

      {/* Hidden file inputs */}
      <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFilePick(f, "avatar"); }}
      />
      {canChangeBanner && (
        <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFilePick(f, "banner"); }}
        />
      )}

      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md px-4"
        onMouseDown={onClose}
      >
        {/* Sheet */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{    opacity: 0, scale: 0.97, y: 12  }}
          transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-[#0a0a0c] border border-white/10 rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide"
        >

          {/* ── Header: Banner + Avatar ──────────────────────────────────── */}
          <div className="relative">
            <button type="button"
              onClick={() => canChangeBanner ? bannerInputRef.current?.click() : undefined}
              disabled={!canChangeBanner}
              className={`relative w-full h-32 bg-white/[0.04] overflow-hidden group block focus:outline-none
                          ${canChangeBanner ? "cursor-pointer" : "cursor-default"}`}
            >
              {displayedBanner ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayedBanner} alt="" className={`w-full h-full object-cover${!canChangeBanner ? " opacity-50" : ""}`} />
              ) : (
                <div className={`w-full h-full bg-white/[0.03]${!canChangeBanner ? " opacity-50" : ""}`} />
              )}
              {canChangeBanner ? (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
                  <Camera size={30} strokeWidth={1.5} className="text-white/80" />
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                  <Lock size={16} strokeWidth={1.5} className="text-white/20" />
                </div>
              )}
            </button>

            {/* Reset button — top-right corner, only when banner exists and user can change it */}
            {canChangeBanner && displayedBanner && (
              <button
                type="button"
                onClick={handleRemoveBanner}
                aria-label="Убрать фон"
                className="absolute top-2 right-2 z-10 p-1.5
                           bg-black/60 rounded-full border border-white/10
                           text-white/50 hover:text-white/90 hover:bg-black/80
                           transition-all duration-150 active:scale-95"
              >
                <Trash2 size={13} strokeWidth={1.5} />
              </button>
            )}
            {/* PLUS / ARTIST gate hint */}
            {!canChangeBanner && (
              <p className="absolute bottom-1.5 left-0 right-0 text-center text-[10px] text-white/30 pointer-events-none">
                Фон профиля — только для{" "}
                <span className="text-amber-400/50">Stillum PLUS</span>
              </p>
            )}

            <div className="absolute -bottom-10 left-6 z-10">
              <button type="button" onClick={() => avatarInputRef.current?.click()}
                className="relative w-20 h-20 rounded-full group cursor-pointer focus:outline-none overflow-hidden border-4 border-[#0a0a0c] bg-white/[0.06]"
              >
                {displayedAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={displayedAvatar} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-xl font-semibold text-white/30 select-none">
                    {initials}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Camera size={20} strokeWidth={1.5} className="text-white/80" />
                </div>
              </button>
            </div>
          </div>

          <div className="h-14" />

          {/* ── Form body ─────────────────────────────────────────────────── */}
          <div className="px-6 pb-6 pt-3 space-y-5">

            {/* Modal title */}
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-white">Редактировать профиль</h2>
              <button type="button" onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="text-[13px] text-red-400/80 text-center"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-widest text-white/30 font-bold px-1">
                Никнейм
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={40}
                placeholder="Ваш никнейм"
                className="w-full bg-transparent border-b border-white/10 focus:border-white/40 outline-none text-sm text-white/80 placeholder:text-white/20 py-2 transition-colors"
              />
            </div>

            {/* ── Status emoji ──────────────────────────────────────────── */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase tracking-widest text-white/30 font-bold px-1">
                  Статус
                </label>
                {isPlus && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-400/60">
                    <Sparkles size={9} strokeWidth={2} />
                    Plus
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Trigger button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isPlus) { setPlusTooltip(true); setTimeout(() => setPlusTooltip(false), 2500); return; }
                      setPickerOpen((v) => !v);
                    }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-colors ${
                      isPlus
                        ? "bg-white/[0.05] hover:bg-white/[0.09] cursor-pointer"
                        : "bg-white/[0.02] cursor-default opacity-40"
                    }`}
                  >
                    {statusEmoji ?? (isPlus
                      ? <Sparkles size={16} strokeWidth={1.5} className="text-white/30" />
                      : <Lock     size={14} strokeWidth={1.5} className="text-white/30" />
                    )}
                  </button>

                  {/* Emoji picker popover */}
                  <AnimatePresence>
                    {pickerOpen && (
                      <EmojiPicker
                        current={statusEmoji}
                        onSelect={setStatusEmoji}
                        onClear={() => setStatusEmoji(null)}
                        onClose={() => setPickerOpen(false)}
                      />
                    )}
                  </AnimatePresence>
                </div>

                {/* Live preview of name + badge */}
                <div className="flex-1 min-w-0">
                  <UserNameWithBadges
                    name={username || user.name || "Никнейм"}
                    plan={user.plan}
                    role={user.role}
                    statusEmoji={statusEmoji}
                    iconSize={14}
                    className="text-[13px] text-white/60 truncate"
                  />
                  {!isPlus && (
                    <p className="text-[11px] text-white/20 mt-0.5">
                      Доступно в{" "}
                      <span className="text-amber-400/50">Stillum Plus</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Plus tooltip */}
              <AnimatePresence>
                {plusTooltip && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="text-[12px] text-amber-400/70 px-1"
                  >
                    Активируйте Stillum Plus, чтобы устанавливать статусы
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Bio */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-widest text-white/30 font-bold px-1">
                О себе
              </label>
              <div className="relative">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={300}
                  rows={3}
                  placeholder="Коротко о себе..."
                  className="w-full bg-transparent border-b border-white/10 focus:border-white/40 outline-none text-sm text-white/70 placeholder:text-white/20 py-2 resize-none transition-colors"
                />
                <span className="absolute right-0 bottom-2 text-[10px] text-white/20">
                  {bio.length}/300
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/[0.05]" />
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">
              Ссылки
            </p>

            <div className="space-y-2.5">
              <SocialInput icon={<TelegramIcon   className="w-4 h-4" />} placeholder="t.me/username"               value={telegramLink}    onChange={setTelegramLink}    />
              <SocialInput icon={<VkIcon         className="w-4 h-4" />} placeholder="vk.com/username"             value={vkLink}          onChange={setVkLink}          />
              <SocialInput icon={<FilledMusicIcon className="w-4 h-4" />} placeholder="Ссылка на карточку артиста" value={yandexMusicLink} onChange={setYandexMusicLink} />
              <SocialInput icon={<FilledGlobeIcon className="w-4 h-4" />} placeholder="band.link/ваша-ссылка"      value={customLink}      onChange={setCustomLink}      />
            </div>

            {/* Save */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || success}
              className="mt-2 w-full bg-white text-black font-bold py-3.5 rounded-xl hover:scale-[1.02] active:scale-[0.99] transition-transform disabled:opacity-60 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {success ? (
                <><Check size={15} strokeWidth={2.5} /> Сохранено</>
              ) : saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Сохранить изменения"
              )}
            </button>

          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
