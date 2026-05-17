"use client";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  destructive,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/65 backdrop-blur-[2px]"
        aria-label="Cerrar overlay"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-[#49483e] bg-[#3e3d32] p-6 shadow-xl">
        <h2 id="confirm-modal-title" className="text-lg font-semibold text-[#f8f8f2]">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#cfd0c9]">{description}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-md border border-[#49483e] bg-[#272822] px-4 py-2 text-sm text-[#f8f8f2] hover:border-[#75715e]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              destructive
                ? "cursor-pointer rounded-md bg-[#f92672] px-4 py-2 text-sm font-medium text-[#272822] hover:bg-[#ff5590]"
                : "cursor-pointer rounded-md bg-[#66d9ef] px-4 py-2 text-sm font-medium text-[#272822] hover:bg-[#8fe8ff]"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
