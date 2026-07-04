import { create } from "zustand";
import { persist } from "zustand/middleware";

type UIState = {
  sidebarHidden: boolean;
  toggleSidebar: () => void;
  setSidebarHidden: (v: boolean) => void;
};

export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarHidden: false,
      toggleSidebar: () => set({ sidebarHidden: !get().sidebarHidden }),
      setSidebarHidden: (v) => set({ sidebarHidden: v }),
    }),
    { name: "esquites-ui" },
  ),
);
