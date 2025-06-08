import * as React from "react";
import { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  showHandle?: boolean;
  maxHeight?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  className,
  showHandle = true,
  maxHeight = "70vh",
}: BottomSheetProps) {
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Handle escape key press
  const handleEscapeKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Focus management
  useEffect(() => {
    if (isOpen && sheetRef.current) {
      const focusableElements = sheetRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;

      if (firstElement) {
        // Small delay to ensure the animation has started
        setTimeout(() => {
          firstElement.focus();
        }, 100);
      }
    }
  }, [isOpen]);

  // Keyboard event listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey);
      // Prevent body scroll when bottom sheet is open
      document.body.style.overflow = "hidden";
    } else {
      document.removeEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleEscapeKey]);

  // Basic swipe down gesture handling
  const [startY, setStartY] = React.useState<number | null>(null);
  const [currentY, setCurrentY] = React.useState<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (startY !== null) {
        setCurrentY(e.touches[0].clientY);
      }
    },
    [startY]
  );

  const handleTouchEnd = useCallback(() => {
    if (startY !== null && currentY !== null) {
      const deltaY = currentY - startY;
      // If swipe down more than 100px, close the sheet
      if (deltaY > 100) {
        onClose();
      }
    }
    setStartY(null);
    setCurrentY(null);
  }, [startY, currentY, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-scorecard border-t border-soft-grey rounded-t-xl shadow-2xl",
          "transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-y-0" : "translate-y-full",
          className
        )}
        style={{ maxHeight }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "bottom-sheet-title" : undefined}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        {showHandle && (
          <div className="flex justify-center pt-4 pb-2">
            <div className="w-12 h-1 bg-soft-grey rounded-full" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-soft-grey">
            <h2
              id="bottom-sheet-title"
              className="text-display-sm font-display font-semibold text-charcoal"
            >
              {title}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-charcoal hover:bg-soft-grey/20"
              aria-label="Close bottom sheet"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Content */}
        <div
          ref={contentRef}
          className="overflow-y-auto overscroll-contain"
          style={{
            maxHeight: title ? "calc(70vh - 120px)" : "calc(70vh - 60px)",
          }}
        >
          <div className="p-6">{children}</div>
        </div>
      </div>
    </>
  );
}

// Hook for managing bottom sheet state
export function useBottomSheet() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [content, setContent] = React.useState<React.ReactNode | string | null>(
    null
  );
  const [title, setTitle] = React.useState<string | undefined>();

  const openSheet = useCallback(
    (sheetContent: React.ReactNode | string, sheetTitle?: string) => {
      setContent(sheetContent);
      setTitle(sheetTitle);
      setIsOpen(true);
    },
    []
  );

  const closeSheet = useCallback(() => {
    setIsOpen(false);
    // Clear content after animation completes
    setTimeout(() => {
      setContent(null);
      setTitle(undefined);
    }, 300);
  }, []);

  return {
    isOpen,
    content,
    title,
    openSheet,
    closeSheet,
  };
}

export default BottomSheet;
