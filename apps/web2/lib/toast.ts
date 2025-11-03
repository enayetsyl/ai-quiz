import { toast as sonnerToast } from "sonner";

/**
 * Centralized toast utility for consistent error and success messaging
 */
export const toast = {
  /**
   * Show success toast
   */
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
    });
  },

  /**
   * Show error toast
   */
  error: (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
    });
  },

  /**
   * Show warning toast
   */
  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, {
      description,
    });
  },

  /**
   * Show info toast
   */
  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
    });
  },

  /**
   * Show loading toast (returns a toast ID that can be used to update/dismiss)
   */
  loading: (message: string) => {
    return sonnerToast.loading(message);
  },

  /**
   * Dismiss a specific toast by ID
   */
  dismiss: (toastId: string | number) => {
    sonnerToast.dismiss(toastId);
  },

  /**
   * Dismiss all toasts
   */
  dismissAll: () => {
    sonnerToast.dismiss();
  },
};
