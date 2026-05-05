import * as cheerio from "cheerio";

export type ScrapedPropertyLink = {
  title: string;
  url: string;
};

export type ScrapeResult = {
  companyName: string;
  siteDescription: string;
  primaryColor: string;
  logoUrl: string;
  sampleProperties: ScrapedPropertyLink[];
  websiteUrl: string;
};

function normalizeUrl(input: string) {
  const value = input.trim();
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function resolveUrl(baseUrl: string, maybeRelative?: string | null) {
  if (!maybeRelative) return "";
  try {
    return new URL(maybeRelative, baseUrl).toString();
  } catch {
    return "";
  }
}

function extractBackgroundColorFromInlineStyle(styleValue: string) {
  const style = styleValue.toLowerCase();
  const match =
    style.match(/background-color\s*:\s*([^;]+)/i) ??
    style.match(/background\s*:\s*([^;]+)/i);
  if (!match?.[1]) return null;
  return match[1].trim();
}

function extractColorFromCssClass(cssText: string, className: string) {
  if (!className) return null;
  const safeClass = className.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeClass) return null;

  const pattern = new RegExp(
    `\\.${safeClass}[^\\{]*\\{[^\\}]*?(?:background-color|background)\\s*:\\s*([^;\\}]+)`,
    "i",
  );
  const match = cssText.match(pattern);
  return match?.[1]?.trim() ?? null;
}

export async function scrapeWebsite(websiteInput: string): Promise<ScrapeResult> {
  const websiteUrl = normalizeUrl(websiteInput);
  const response = await fetch(websiteUrl, {
    headers: {
      "user-agent": "OlabitsEstateBot-Scraper/1.0",
      accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to scrape website (${response.status}).`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const companyName =
    $('meta[property="og:site_name"]').attr("content")?.trim() ||
    $("title").first().text().trim() ||
    "Unnamed Real Estate Company";

  const siteDescription =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    `${companyName} real estate website.`;

  const logoUrl =
    resolveUrl(
      websiteUrl,
      $('meta[property="og:image"]').attr("content") ||
        $('link[rel="apple-touch-icon"]').attr("href") ||
        $('link[rel*="icon"]').attr("href"),
    ) || "";

  const styleBundle = $("style")
    .map((_, el) => $(el).text())
    .get()
    .join("\n");

  let primaryColor =
    $('meta[name="theme-color"]').attr("content")?.trim() ?? "#2563eb";

  const firstBrandElement = $("header, button").first();
  if (firstBrandElement.length) {
    const inlineStyle = firstBrandElement.attr("style") ?? "";
    const inlineColor = extractBackgroundColorFromInlineStyle(inlineStyle);
    if (inlineColor) {
      primaryColor = inlineColor;
    } else {
      const classes = (firstBrandElement.attr("class") ?? "")
        .split(/\s+/)
        .filter(Boolean);
      for (const className of classes) {
        const classColor = extractColorFromCssClass(styleBundle, className);
        if (classColor) {
          primaryColor = classColor;
          break;
        }
      }
    }
  }

  const propertyLinks = $('a[href*="/property/"], a[href*="/listing/"]')
    .map((_, el) => {
      const href = $(el).attr("href");
      const title = $(el).text().trim();
      const absoluteUrl = resolveUrl(websiteUrl, href);
      return {
        title: title || absoluteUrl.split("/").at(-1)?.replace(/[-_]/g, " ") || "Property",
        url: absoluteUrl,
      };
    })
    .get()
    .filter((item) => item.url)
    .slice(0, 8);

  return {
    companyName,
    siteDescription,
    primaryColor,
    logoUrl,
    sampleProperties: propertyLinks,
    websiteUrl,
  };
}
