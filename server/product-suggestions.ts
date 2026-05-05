type SuggestionCandidate = {
  _id?: string;
  id?: string;
  name?: string;
  description?: string;
  price?: number | string;
  rating?: number | string;
  reviewCount?: number;
  isFeatured?: boolean;
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "at",
  "by",
  "for",
  "fresh",
  "from",
  "in",
  "of",
  "on",
  "or",
  "pack",
  "pcs",
  "per",
  "premium",
  "the",
  "to",
  "with",
]);

function toNumber(value: number | string | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function extractKeywords(candidate: SuggestionCandidate): string[] {
  const rawText = `${candidate.name ?? ""} ${candidate.description ?? ""}`.toLowerCase();

  return Array.from(
    new Set(
      rawText
        .split(/[^a-z0-9]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)),
    ),
  );
}

function getCandidateId(candidate: SuggestionCandidate): string {
  return candidate.id ?? candidate._id ?? "";
}

function getSuggestionScore(current: SuggestionCandidate, candidate: SuggestionCandidate): number {
  const currentKeywords = extractKeywords(current);
  const candidateKeywords = new Set(extractKeywords(candidate));
  const matchingKeywords = currentKeywords.filter((keyword) => candidateKeywords.has(keyword)).length;

  const currentPrice = toNumber(current.price);
  const candidatePrice = toNumber(candidate.price);
  const priceDelta = currentPrice > 0 ? Math.abs(candidatePrice - currentPrice) / currentPrice : Number.POSITIVE_INFINITY;
  const isWithinPriceRange = priceDelta <= 0.2;

  const rating = toNumber(candidate.rating);
  const reviewCount = typeof candidate.reviewCount === "number" ? candidate.reviewCount : 0;

  return [
    matchingKeywords * 10,
    isWithinPriceRange ? 8 : 0,
    Math.min(rating, 5) * 2,
    Math.min(reviewCount, 100) / 20,
    candidate.isFeatured ? 1 : 0,
  ].reduce((sum, part) => sum + part, 0);
}

export function rankSuggestedProducts<T extends SuggestionCandidate>(
  current: SuggestionCandidate,
  candidates: T[],
  limit = 5,
): T[] {
  const currentId = getCandidateId(current);

  return [...candidates]
    .filter((candidate) => getCandidateId(candidate) !== currentId)
    .sort((left, right) => getSuggestionScore(current, right) - getSuggestionScore(current, left))
    .slice(0, limit);
}

export function mergeUniqueSuggestions<T extends SuggestionCandidate>(primary: T[], fallback: T[], limit = 5): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];

  for (const candidate of [...primary, ...fallback]) {
    const candidateId = getCandidateId(candidate);
    if (!candidateId || seen.has(candidateId)) {
      continue;
    }

    seen.add(candidateId);
    merged.push(candidate);

    if (merged.length >= limit) {
      break;
    }
  }

  return merged;
}