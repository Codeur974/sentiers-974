import { create } from "zustand";

type LocationCoords = {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  timestamp: number;
};
type LocationState = {
  coords: LocationCoords | null;
  isLocating: boolean;
  address: string | null;
  locationError: string | null;
  hasPermission: boolean | null;
  highAccuracy: boolean;
  watching: boolean;
  watchSubscription: any;
  setCoords: (coords: LocationCoords) => void;
  setAddress: (address: string | null) => void;
  setIsLocating: (isLocating: boolean) => void;
  setError: (error: string | null) => void;
  setPermission: (hasPermission: boolean | null) => void;
  setWatching: (watching: boolean) => void;
  setWatchSubscription: (subscription: any) => void;
  reset: () => void;
};
export const useLocationStore = create<LocationState>((set, get) => ({
  coords: null,
  isLocating: false,
  address: null,
  locationError: null,
  hasPermission: null,
  highAccuracy: true,
  watching: false,
  watchSubscription: null,
  setCoords: (coords: LocationCoords) => set({ coords }),
  setAddress: (address: string | null) => set({ address }),
  setIsLocating: (isLocating: boolean) => set({ isLocating }),
  setError: (error: string | null) => set({ locationError: error }),
  setPermission: (hasPermission: boolean | null) => set({ hasPermission }),
  setWatching: (watching: boolean) => {
    const state = get();
    if (!watching && state.watchSubscription) {
      // Arrêter le watching si on le désactive
      state.watchSubscription.remove();
    }
    set({ watching });
  },
  setWatchSubscription: (subscription: any) => set({ watchSubscription: subscription }),
  reset: () => {
    const state = get();
    if (state.watchSubscription) {
      state.watchSubscription.remove();
    }
    set({
      coords: null,
      address: null,
      isLocating: false,
      locationError: null,
      hasPermission: null,
      highAccuracy: true,
      watching: false,
      watchSubscription: null,
    });
  },
}));