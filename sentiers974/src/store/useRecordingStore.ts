import { create } from 'zustand';

interface RecordingStore {
  isRecording: boolean;
  isPaused: boolean;
  selectedSport: any;
  setRecording: (recording: boolean) => void;
  setPaused: (paused: boolean) => void;
  setSelectedSport: (sport: any) => void;
  resetRecording: () => void;
}

export const useRecordingStore = create<RecordingStore>((set) => ({
  isRecording: false,
  isPaused: false,
  selectedSport: null,
  setRecording: (recording: boolean) => set({ isRecording: recording }),
  setPaused: (paused: boolean) => set({ isPaused: paused }),
  setSelectedSport: (sport: any) => set({ selectedSport: sport }),
  resetRecording: () => set({ isRecording: false, isPaused: false, selectedSport: null }),
}));