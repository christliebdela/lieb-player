import { invoke } from '@tauri-apps/api/core';

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalInfo = console.info;

const formatMessage = (args: any[]) => {
  return args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return '[Circular/Complex Object]';
      }
    }
    return String(arg);
  }).join(' ');
};

export const initLogger = () => {
  // Only override in production or if requested
  // For now, we'll do it always if it's production
  const isProd = import.meta.env.PROD;

  if (isProd) {
    console.log = (...args: any[]) => {
      originalLog(...args);
      invoke('write_log', { message: `[LOG] ${formatMessage(args)}` }).catch(originalError);
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      invoke('write_log', { message: `[ERROR] ${formatMessage(args)}` }).catch(originalError);
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      invoke('write_log', { message: `[WARN] ${formatMessage(args)}` }).catch(originalError);
    };

    console.info = (...args: any[]) => {
      originalInfo(...args);
      invoke('write_log', { message: `[INFO] ${formatMessage(args)}` }).catch(originalError);
    };

    console.log('>>> Production Logger Initialized - Lieb Player');
  }
};
