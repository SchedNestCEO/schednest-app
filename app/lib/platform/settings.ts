export type PlatformProfileSettings = {
  displayName: string;
  preferredName: string;
  phone: string;
  timezone: string;
  locale: string;
  preferredLanguage: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
  weekStartsOn: number;
};

export type PlatformPrivacySettings = {
  analyticsEnabled: boolean;
  personalizationEnabled: boolean;
  productCrossContextEnabled: boolean;
  allowBirdyLearning: boolean;
  allowSensitiveMemory: boolean;
  allowUsageImprovement: boolean;
  defaultSharingScope:
    | "private"
    | "approved_people"
    | "workspace";
  dataRetentionDays: number | null;
};

export type PlatformAccessibilitySettings = {
  largeText: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  simplifiedNavigation: boolean;
  screenReaderOptimized: boolean;
  plainLanguage: boolean;
  largerControls: boolean;
};
