import type { NormalizedNewsItem } from "./newsTypes";

export function getLocalizedNewsText(item: NormalizedNewsItem, language: string) {
  const wantsChinese = language.toLowerCase().startsWith("zh");

  if (wantsChinese) {
    return {
      title: item.titleZh || item.titleOriginal || item.titleEn,
      summary: item.summaryZh || item.summaryOriginal || item.summaryEn,
    };
  }

  return {
    title: item.titleEn || item.titleOriginal || item.titleZh,
    summary: item.summaryEn || item.summaryOriginal || item.summaryZh,
  };
}
