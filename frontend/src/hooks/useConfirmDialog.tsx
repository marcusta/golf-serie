import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmDialogOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
};

type ConfirmDialogState = ConfirmDialogOptions & { open: boolean };

const defaultState: ConfirmDialogState = {
  open: false,
  title: "Are you sure?",
  description: "",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  variant: "default",
};

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmDialogState>(defaultState);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    setState({
      ...defaultState,
      ...options,
      open: true,
    });

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setState((prev) => ({ ...prev, open: false }));
      if (resolverRef.current) {
        resolverRef.current(false);
        resolverRef.current = null;
      }
    }
  }, []);

  const handleConfirm = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  }, []);

  const dialog = useMemo(
    () => (
      <AlertDialog open={state.open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{state.title}</AlertDialogTitle>
            {state.description ? (
              <AlertDialogDescription>{state.description}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{state.cancelLabel}</AlertDialogCancel>
            <AlertDialogAction
              className={state.variant === "destructive" ? "bg-flag text-white hover:bg-flag/90" : undefined}
              onClick={handleConfirm}
            >
              {state.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ),
    [handleConfirm, handleOpenChange, state]
  );

  return { confirm, dialog };
}
