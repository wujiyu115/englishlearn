// frontend/src/stores/userStore.ts
import { create } from "zustand";
import type { User } from "../types";

interface UserStore {
  user: User | null;
  setUser: (user: User | null) => void;
  addXP: (amount: number) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  addXP: (amount) =>
    set((state) => ({
      user: state.user ? { ...state.user, total_xp: state.user.total_xp + amount } : null,
    })),
}));
