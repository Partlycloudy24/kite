import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";

export interface EditorSettings {
  showUndoRedo: boolean;
  showShare: boolean;
}

interface EditorSettingsStore extends EditorSettings {
  setShowUndoRedo: (showUndoRedo: boolean) => void;
  setShowShare: (showShare: boolean) => void;
  updateSettings: (settings: Partial<EditorSettings>) => void;
}

export const useEditorSettingsStore = create<EditorSettingsStore>()(
  persist(
    (set) => ({
      showUndoRedo: true,
      showShare: true,
      setShowUndoRedo: (showUndoRedo) => set({ showUndoRedo }),
      setShowShare: (showShare) => set({ showShare }),
      updateSettings: (settings) => set((state) => ({ ...state, ...settings })),
    }),
    {
      name: "kite-editor-settings",
    }
  )
);

export function useEditorSettings() {
  const store = useEditorSettingsStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return {
    showUndoRedo: mounted ? store.showUndoRedo : true,
    showShare: mounted ? store.showShare : true,
    setShowUndoRedo: store.setShowUndoRedo,
    setShowShare: store.setShowShare,
    updateSettings: store.updateSettings,
  };
}
