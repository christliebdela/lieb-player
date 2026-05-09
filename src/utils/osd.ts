import { usePlayerStore } from '../store/usePlayerStore';

let actionOSDTimer: number | null = null;

export const showActionOSD = (message: string, icon: string) => {
  usePlayerStore.getState().setActionOSD({ message, icon });
  if (actionOSDTimer) window.clearTimeout(actionOSDTimer);
  actionOSDTimer = window.setTimeout(() => {
    usePlayerStore.getState().setActionOSD(null);
  }, 1500);
};
