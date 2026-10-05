import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Garage: undefined;
  Refueling: undefined;
  ServiceBook: undefined;
  Telemetry: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  TermsOfService: undefined;
};
