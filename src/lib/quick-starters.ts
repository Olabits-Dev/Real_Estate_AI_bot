type StarterProperty = {
  title?: string | null;
  location?: string | null;
  propertyType?: string | null;
};

type BuildQuickStartersOptions = {
  companyName?: string;
  primaryLocation?: string;
  properties?: StarterProperty[];
};

export function buildQuickStarters({
  companyName,
  primaryLocation,
  properties = [],
}: BuildQuickStartersOptions) {
  const starters: string[] = [];
  const seen = new Set<string>();

  const pushStarter = (value: string) => {
    const prompt = value.trim();
    if (!prompt || seen.has(prompt)) return;
    seen.add(prompt);
    starters.push(prompt);
  };

  for (const property of properties) {
    if (starters.length >= 3) break;
    if (property.title) {
      pushStarter(`Show me details for ${property.title}`);
      continue;
    }

    if (property.propertyType || property.location) {
      const type = property.propertyType ?? "properties";
      const place = property.location ? ` in ${property.location}` : "";
      pushStarter(`Show me available ${type}${place}`);
    }
  }

  if (starters.length < 3 && primaryLocation) {
    pushStarter(`Show me available homes in ${primaryLocation}`);
  }

  if (starters.length < 3 && companyName) {
    pushStarter(`What are ${companyName}'s best current deals?`);
  }

  if (starters.length < 3) {
    pushStarter("Show me available homes");
  }
  if (starters.length < 3) {
    pushStarter("Do you have listings under 50M?");
  }
  if (starters.length < 3) {
    pushStarter("I'm looking to invest in land");
  }

  return starters.slice(0, 3);
}
