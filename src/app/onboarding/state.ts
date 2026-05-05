export type OnboardingPreview = {
  companyId: string;
  companyName: string;
  websiteUrl: string;
  primaryColor: string;
  logoUrl: string;
  companyPublicKey: string;
  snippet: string;
  isSubscribed: boolean;
  plan: "SILVER" | "GOLD" | "PLATINUM" | null;
  sampleProperties: Array<{ title: string; url: string }>;
};

export type OnboardingState = {
  status: "idle" | "success" | "error";
  message: string;
  preview: OnboardingPreview | null;
};

export type EmailState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialOnboardingState: OnboardingState = {
  status: "idle",
  message: "",
  preview: null,
};

export const initialEmailState: EmailState = {
  status: "idle",
  message: "",
};
