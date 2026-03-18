"use client";

import { useState, useRef, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ArrowRight, Check, Loader2 } from "lucide-react";
import ImageCropperModal from "@/components/modals/ImageCropperModal";
import { getImageUploadUrl, completeOnboarding, type OnboardingResult } from "@/app/actions/onboarding";

// ─── Step transition variants ─────────────────────────────────────────────────

const variants = {
  enter:  (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir: number) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
};

const transition = { type: "spring" as const, stiffness: 380, damping: 30 };

// ─── ProgressDots ─────────────────────────────────────────────────────────────

function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-300 ${
            i + 1 === step
              ? "w-6 bg-white/80"
              : i + 1 < step
              ? "w-2 bg-white/40"
              : "w-2 bg-white/15"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Buttons ──────────────────────────────────────────────────────────────────

function PrimaryBtn({
  onClick,
  disabled,
  loading,
  children,
}: {
  onClick:   () => void;
  disabled?: boolean;
  loading?:  boolean;
  children:  React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex items-center gap-2 px-8 py-3 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

function SkipBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-6 py-3 rounded-full border border-white/[0.10] text-white/45 hover:text-white/75 hover:border-white/20 transition-all text-sm"
    >
      Пропустить
    </button>
  );
}

// ─── Image upload helper ──────────────────────────────────────────────────────

async function uploadImage(file: File, type: "avatar"): Promise<string> {
  const { uploadUrl, publicUrl } = await getImageUploadUrl(type, file.type);
  await fetch(uploadUrl, {
    method:  "PUT",
    body:    file,
    headers: { "Content-Type": file.type },
  });
  return publicUrl;
}

// ─── OnboardingFlow ───────────────────────────────────────────────────────────

export default function OnboardingFlow() {
  const [step,      setStep]      = useState(1);
  const [direction, setDirection] = useState(1);

  // Step data
  const [nickname,   setNickname]   = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bio,        setBio]        = useState("");

  // Previews
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Crop modal state
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  // Error + loading
  const [stepErrors,  setStepErrors]   = useState<Partial<Record<number, string>>>({});
  const [uploading,   setUploading]    = useState(false);
  const [isPending,   startTransition] = useTransition();

  function setStepError(s: number, msg: string | null) {
    setStepErrors((prev) => ({ ...prev, [s]: msg ?? undefined }));
  }
  function clearStepError(s: number) {
    setStepErrors((prev) => { const n = { ...prev }; delete n[s]; return n; });
  }

  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ── Validation ─────────────────────────────────────────────────────────────
  const USERNAME_RE = /^[a-zA-Z0-9_.]{3,30}$/;
  const step1Valid  = USERNAME_RE.test(nickname.trim());
  const step2Valid  = avatarFile !== null;
  const step3Valid  = bio.trim().length > 0;

  // ── Navigation ─────────────────────────────────────────────────────────────

  function goTo(next: number) {
    setDirection(next > step ? 1 : -1);
    clearStepError(step);
    setStep(next);
  }

  // ── Image crop flow ────────────────────────────────────────────────────────

  function handleImagePick(file: File) {
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  function handleApplyCrop(file: File) {
    const url = URL.createObjectURL(file);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(url);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  function handleCancelCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  // ── Finish ─────────────────────────────────────────────────────────────────

  async function handleFinish() {
    clearStepError(3);
    setUploading(true);

    let finalAvatar: string | null = null;

    try {
      if (avatarFile) finalAvatar = await uploadImage(avatarFile, "avatar");
    } catch {
      setStepError(3, "Ошибка загрузки изображения. Попробуй еще раз.");
      setUploading(false);
      return;
    }

    setUploading(false);

    startTransition(async () => {
      const result: OnboardingResult = await completeOnboarding({
        username:  nickname,
        bio,
        avatarUrl: finalAvatar,
      });
      if ("error" in result) {
        if (result.field === "username") {
          setStepError(1, result.error);
          setDirection(-1);
          setStep(1);
        } else {
          setStepError(3, result.error);
        }
      }
    });
  }

  const isLoading = uploading || isPending;

  // ── Step content ───────────────────────────────────────────────────────────

  const stepContent = [

    /* ── Step 1: Nickname ─────────────────────────────────────────────── */
    <div key={1} className="flex flex-col items-center gap-6 w-full max-w-md">
      <div className="text-center">
        <p className="text-[11px] tracking-[0.2em] text-white/30 uppercase mb-3">Шаг 1 из 3</p>
        <h2 className="text-3xl font-bold text-white mb-2">Как тебя зовут?</h2>
        <p className="text-white/40 text-[15px]">Выбери уникальное имя — по нему тебя будут находить другие слушатели.</p>
      </div>

      <input
        type="text"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="ryousaku"
        maxLength={30}
        autoFocus
        className="bg-transparent text-center text-4xl font-black text-white placeholder:text-white/20 focus:outline-none w-full border-b border-white/[0.08] focus:border-white/30 transition-colors pb-3"
      />
      <p className="text-[12px] text-white/25 -mt-3">3–30 символов · буквы, цифры, . и _</p>

      {stepErrors[1] && (
        <p className="text-[13px] text-red-400/80 text-center">{stepErrors[1]}</p>
      )}

      <div className="flex flex-col items-center gap-2 mt-2">
        <PrimaryBtn onClick={() => goTo(2)} disabled={!step1Valid}>
          Далее <ArrowRight size={16} strokeWidth={2.5} />
        </PrimaryBtn>
      </div>
    </div>,

    /* ── Step 2: Avatar ───────────────────────────────────────────────── */
    <div key={2} className="flex flex-col items-center gap-6 w-full max-w-md">
      <div className="text-center">
        <p className="text-[11px] tracking-[0.2em] text-white/30 uppercase mb-3">Шаг 2 из 3</p>
        <h2 className="text-3xl font-bold text-white mb-2">Добавь своё лицо</h2>
        <p className="text-white/40 text-[15px]">Аватар помогает другим тебя найти</p>
      </div>

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImagePick(f);
        }}
      />

      <button
        type="button"
        onClick={() => avatarInputRef.current?.click()}
        className="w-40 h-40 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center cursor-pointer hover:bg-white/[0.08] transition-colors overflow-hidden relative group"
      >
        {avatarPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-white/30 group-hover:text-white/60 transition-colors">
            <Camera size={32} strokeWidth={1} />
            <span className="text-[12px]">Выбрать фото</span>
          </div>
        )}
        {avatarPreview && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera size={22} strokeWidth={1.5} className="text-white" />
          </div>
        )}
      </button>

      <p className="text-[11px] uppercase tracking-widest text-white/20">
        Рекомендуемое разрешение: 1000x1000px • Формат: JPG, PNG
      </p>

      <div className="flex flex-col items-center gap-2 mt-2">
        <div className="flex gap-3">
          <SkipBtn onClick={() => goTo(3)} />
          <PrimaryBtn onClick={() => goTo(3)} disabled={!step2Valid}>
            Далее <ArrowRight size={16} strokeWidth={2.5} />
          </PrimaryBtn>
        </div>
      </div>
    </div>,

    /* ── Step 3: Bio ──────────────────────────────────────────────────── */
    <div key={3} className="flex flex-col items-center gap-6 w-full max-w-lg">
      <div className="text-center">
        <p className="text-[11px] tracking-[0.2em] text-white/30 uppercase mb-3">Шаг 3 из 3</p>
        <h2 className="text-3xl font-bold text-white mb-2">Пара слов о тебе</h2>
        <p className="text-white/40 text-[15px]">Необязательно, но так тебя лучше найдут</p>
      </div>

      <div className="w-full relative">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Что тебя вдохновляет?"
          maxLength={300}
          className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 text-white text-[15px] leading-relaxed focus:outline-none focus:border-white/20 focus:bg-white/[0.06] w-full resize-none h-36 placeholder:text-white/20 transition-all"
        />
        <span className="absolute bottom-4 right-5 text-[11px] text-white/20 pointer-events-none">
          {bio.length}/300
        </span>
      </div>

      {stepErrors[3] && (
        <p className="text-[13px] text-red-400/80 text-center -mt-2">{stepErrors[3]}</p>
      )}

      <div className="flex flex-col items-center gap-2 mt-2">
        <div className="flex gap-3">
          <SkipBtn onClick={handleFinish} />
          <PrimaryBtn onClick={handleFinish} disabled={!step3Valid} loading={isLoading}>
            {!isLoading && <Check size={15} strokeWidth={2.5} />}
            {isLoading ? "Сохранение…" : "Завершить"}
          </PrimaryBtn>
        </div>
      </div>
    </div>,
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center p-6">

      {/* Progress indicator */}
      <div className="mb-16">
        <ProgressDots step={step} total={3} />
      </div>

      {/* Animated step content */}
      <div className="w-full flex justify-center overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            className="w-full flex justify-center px-4"
          >
            {stepContent[step - 1]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Crop modal */}
      <AnimatePresence>
        {cropSrc && (
          <ImageCropperModal
            src={cropSrc}
            aspect={1}
            cropShape="round"
            onApply={handleApplyCrop}
            onCancel={handleCancelCrop}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
