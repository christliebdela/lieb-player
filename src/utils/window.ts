import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { usePlayerStore } from '../store/usePlayerStore';

export const openWindow = async (label: string, title: string, width: number, height: number) => {
  try {
    const existing = await WebviewWindow.getByLabel(label);
    if (existing) {
      await existing.setFocus();
      return;
    }

    const mainWin = getCurrentWindow();
    const outerSize = await mainWin.outerSize();
    const outerPos = await mainWin.outerPosition();
    const scaleFactor = await mainWin.scaleFactor();

    // Calculate center position in logical pixels
    const centerX = (outerPos.x + (outerSize.width / 2)) / scaleFactor - (width / 2);
    const centerY = (outerPos.y + (outerSize.height / 2)) / scaleFactor - (height / 2);

    const win = new WebviewWindow(label, {
      url: '/',
      title,
      width,
      height,
      x: centerX,
      y: centerY,
      decorations: false,
      transparent: true,
      alwaysOnTop: false,
      parent: mainWin, // Set parent for grouped focus
    });

    // Show blocking overlay on main window
    usePlayerStore.getState().setBlocking(true);

    // Re-enable when closed
    win.once('tauri://destroyed', () => {
      usePlayerStore.getState().setBlocking(false);
      mainWin.setFocus();
    });

    win.once('tauri://error', () => {
      usePlayerStore.getState().setBlocking(false);
    });
  } catch (err) {
    console.error(`Failed to open ${label} window:`, err);
  }
};

export const closeWindow = async (label: string) => {
  try {
    const existing = await WebviewWindow.getByLabel(label);
    if (existing) await existing.close();
  } catch {}
};
