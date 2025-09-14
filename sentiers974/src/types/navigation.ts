import type { StackScreenProps } from "@react-navigation/stack";
import { SentierReel } from "../services/sentiersService";

export type RootStackParamList = {
  Home: {
    openCreatePost?: () => void;
  } | undefined;
  Sports: undefined;
  Tracking: {
    selectedSport?: any;
  } | undefined;
  Events: undefined;
  Sentiers: undefined;
  SentierDetail: {
    sentier: SentierReel;
  };
};

export type RootStackScreenProps<Screen extends keyof RootStackParamList> =
  StackScreenProps<RootStackParamList, Screen>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}