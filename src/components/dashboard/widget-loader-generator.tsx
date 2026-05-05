import { CopyBlock } from "@/components/dashboard/copy-block";
type WidgetLoaderGeneratorProps = {
  publicKey: string;
  baseUrl: string;
};

export function WidgetLoaderGenerator({ publicKey, baseUrl }: WidgetLoaderGeneratorProps) {
  const universalLoaderScript = `<script src="${baseUrl}/widget.js" data-public-key="${publicKey}" defer></script>`;

  const typeScriptWindowDeclaration = `declare global {
  interface RealEstateBotConfig {
    publicKey?: string;
    apiKey?: string; // legacy support
    apiBaseUrl?: string;
    mountId?: string;
  }

  interface Window {
    OlabitsWidgetConfig?: {
      publicKey?: string;
      apiKey?: string; // legacy support
      apiBaseUrl?: string;
      mountId?: string;
    };
    RealEstateBotConfig?: RealEstateBotConfig; // legacy support
  }
}

export {};
`;

  return (
    <div className="space-y-3">
      <CopyBlock label="Universal Loader Script" value={universalLoaderScript} multiline />
      <CopyBlock
        label="For TypeScript Users"
        value={typeScriptWindowDeclaration}
        multiline
      />
    </div>
  );
}
