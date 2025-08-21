import { create } from "zustand";

type SessionStatus = "idle" | "running" | "paused" | "stopped";

type SessionState = {
  status: SessionStatus;
  startedAt?: number;
  endedAt?: number;

  start: () => boolean;
  pause: () => boolean;
  resume: () => boolean;
  stop: () => boolean;
  reset: () => boolean;
  hardReset: () => void;

  //  Getter ajouté ici
  duration: () => number;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  status: "idle",

  start: () => {
    const { status } = get();
    if (status === "idle" || status === "stopped") {
      set({ status: "running", startedAt: Date.now(), endedAt: undefined });
      return true;
    }
    return false;
  },

  pause: () => {
    if (get().status === "running") {
      set({ status: "paused" });
      return true;
    }
    return false;
  },

  resume: () => {
    if (get().status === "paused") {
      set({ status: "running" });
      return true;
    }
    return false;
  },

  stop: () => {
    const { status } = get();
    if (status === "running" || status === "paused") {
      set({ status: "stopped", endedAt: Date.now() });
      return true;
    }
    return false;
  },

  reset: () => {
    const { status } = get();
    if (status === "stopped" || status === "idle") {
      set({ status: "idle", startedAt: undefined, endedAt: undefined });
      return true;
    }
    return false;
  },

  hardReset: () => {
    set({ status: "idle", startedAt: undefined, endedAt: undefined });
  },

  //  Getter ici
  duration: () => {
    const { startedAt, endedAt, status } = get();
    if (!startedAt) return 0;
    if (status === "running") return Date.now() - startedAt;
    if (endedAt) return endedAt - startedAt;
    return 0;
  },
}));
