import { toast } from "sonner";

/**
 * Consolidated notification system for TapScore admin interface.
 * Wraps sonner toast with semantic helper methods.
 *
 * @example
 * const { showSuccess, showError, showWarning, showInfo } = useNotification();
 *
 * // On success
 * showSuccess("Player added successfully");
 *
 * // On error
 * showError("Failed to save changes");
 *
 * // With error object
 * try { ... } catch (err) {
 *   showError(err instanceof Error ? err.message : "Operation failed");
 * }
 */
export function useNotification() {
  const showSuccess = (message: string) => {
    toast.success(message);
  };

  const showError = (message: string) => {
    toast.error(message);
  };

  const showWarning = (message: string) => {
    toast.warning(message);
  };

  const showInfo = (message: string) => {
    toast.info(message);
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}

/**
 * Utility to format error messages from caught exceptions.
 * @param err - The caught error
 * @param fallback - Default message if err is not an Error instance
 */
export function formatErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}
