import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  Camera,
  History,
  ImagePlus,
  Loader2,
  Mic,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const RECENT_IMAGE_SEARCHES_KEY = "citybell_food_image_searches";
const MAX_RECENT_IMAGE_SEARCHES = 5;
const MAX_IMAGE_SIZE_BYTES = 6 * 1024 * 1024;

type FoodImageSearchResult = {
  id?: string;
  _id?: string;
  restaurantId: string;
  restaurantName: string;
  restaurantRating?: number;
  name: string;
  description?: string;
  category?: string;
  image?: string;
  price: number | string;
  matchKeywords?: string[];
};

type FoodImageSearchResponse = {
  success: boolean;
  cached?: boolean;
  detectedItems: string[];
  predictions: Array<{ name: string; confidence: number }>;
  results: FoodImageSearchResult[];
  message?: string;
};

type RecentImageSearch = {
  cacheKey: string;
  previewDataUrl: string;
  searchedAt: string;
  response: FoodImageSearchResponse;
};

type FoodImageSearchBarProps = {
  value: string;
  onValueChange: (value: string) => void;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

function loadRecentImageSearches() {
  if (typeof window === "undefined") {
    return [] as RecentImageSearch[];
  }

  try {
    const rawValue = window.localStorage.getItem(RECENT_IMAGE_SEARCHES_KEY);
    if (!rawValue) {
      return [] as RecentImageSearch[];
    }

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [] as RecentImageSearch[];
    }

    return parsed.slice(0, MAX_RECENT_IMAGE_SEARCHES) as RecentImageSearch[];
  } catch {
    return [] as RecentImageSearch[];
  }
}

function saveRecentImageSearches(entries: RecentImageSearch[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    RECENT_IMAGE_SEARCHES_KEY,
    JSON.stringify(entries.slice(0, MAX_RECENT_IMAGE_SEARCHES)),
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Unable to read image"));
    reader.readAsDataURL(file);
  });
}

async function createFileSignature(file: File) {
  const buffer = await file.arrayBuffer();

  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const digest = await window.crypto.subtle.digest("SHA-1", buffer);
    return Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  }

  return `${file.name}-${file.size}-${file.lastModified}`;
}

function formatPrice(price: number | string) {
  const numericPrice = typeof price === "number" ? price : Number(price);
  if (!Number.isFinite(numericPrice)) {
    return String(price);
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: numericPrice % 1 === 0 ? 0 : 2,
  }).format(numericPrice);
}

function formatConfidence(confidence: number) {
  return `${Math.round(confidence * 100)}%`;
}

function normalizeResponse(payload: any): FoodImageSearchResponse {
  return {
    success: Boolean(payload?.success),
    cached: Boolean(payload?.cached),
    detectedItems: Array.isArray(payload?.detectedItems) ? payload.detectedItems : [],
    predictions: Array.isArray(payload?.predictions)
      ? payload.predictions
          .filter((prediction: any) => typeof prediction?.name === "string" && typeof prediction?.confidence === "number")
          .map((prediction: any) => ({ name: prediction.name, confidence: prediction.confidence }))
      : [],
    results: Array.isArray(payload?.results) ? payload.results : [],
    message: typeof payload?.message === "string" ? payload.message : undefined,
  };
}

export function FoodImageSearchBar({ value, onValueChange }: FoodImageSearchBarProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const lastTranscriptRef = useRef("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceAnnouncement, setVoiceAnnouncement] = useState("Voice search ready.");
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [response, setResponse] = useState<FoodImageSearchResponse | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentImageSearch[]>(() => loadRecentImageSearches());

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const persistRecentSearch = (entry: RecentImageSearch) => {
    setRecentSearches((currentEntries) => {
      const nextEntries = [entry, ...currentEntries.filter((item) => item.cacheKey !== entry.cacheKey)]
        .slice(0, MAX_RECENT_IMAGE_SEARCHES);
      saveRecentImageSearches(nextEntries);
      return nextEntries;
    });
  };

  const resetImageSearch = () => {
    setPreviewDataUrl(null);
    setErrorMessage(null);
    setResponse(null);
    setIsProcessing(false);
    setIsPanelOpen(false);
  };

  const restoreRecentSearch = (entry: RecentImageSearch) => {
    setPreviewDataUrl(entry.previewDataUrl);
    setResponse(entry.response);
    setErrorMessage(entry.response.success ? null : entry.response.message ?? null);
    setIsPanelOpen(true);
  };

  const getSpeechRecognition = () => {
    if (recognitionRef.current) {
      return recognitionRef.current;
    }

    if (typeof window === "undefined") {
      return null;
    }

    const SpeechRecognitionConstructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) {
      return null;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.onstart = () => {
      lastTranscriptRef.current = "";
      setIsListening(true);
      setVoiceAnnouncement("Listening started");
    };
    recognition.onresult = (event) => {
      let transcript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index]?.[0]?.transcript ?? "";
      }

      const normalizedTranscript = transcript.trim();
      if (!normalizedTranscript) {
        return;
      }

      lastTranscriptRef.current = normalizedTranscript;
      onValueChange(normalizedTranscript);
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      setVoiceAnnouncement(event.error === "not-allowed" ? "Microphone access denied" : "Voice search failed");
    };
    recognition.onend = () => {
      const transcript = lastTranscriptRef.current.trim();
      setIsListening(false);
      setVoiceAnnouncement(transcript ? "Listening stopped. Search updated." : "Listening stopped");
      searchInputRef.current?.focus();
    };

    recognitionRef.current = recognition;
    return recognition;
  };

  const handleVoiceSearch = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = getSpeechRecognition();
    if (!recognition) {
      setVoiceAnnouncement("Voice search is not supported on this device");
      return;
    }

    recognition.start();
  };

  const processFile = async (file: File) => {
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      setErrorMessage("Upload a PNG or JPEG image.");
      setIsPanelOpen(true);
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setErrorMessage("Image must be 6MB or smaller.");
      setIsPanelOpen(true);
      return;
    }

    setIsPanelOpen(true);
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const [cacheKey, nextPreviewDataUrl] = await Promise.all([
        createFileSignature(file),
        readFileAsDataUrl(file),
      ]);

      setPreviewDataUrl(nextPreviewDataUrl);

      const cachedEntry = recentSearches.find((entry) => entry.cacheKey === cacheKey);
      if (cachedEntry) {
        setResponse({ ...cachedEntry.response, cached: true });
        setErrorMessage(cachedEntry.response.success ? null : cachedEntry.response.message ?? null);
        setIsProcessing(false);
        return;
      }

      const formData = new FormData();
      formData.append("image", file);

      const apiResponse = await fetch("/api/image-search", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const payload = normalizeResponse(await apiResponse.json().catch(() => ({})));
      setResponse(payload);
      setErrorMessage(!apiResponse.ok || !payload.success ? payload.message ?? "Image search failed." : null);

      if (apiResponse.ok && payload.success) {
        persistRecentSearch({
          cacheKey,
          previewDataUrl: nextPreviewDataUrl,
          searchedAt: new Date().toISOString(),
          response: payload,
        });
      }
    } catch (error) {
      setResponse(null);
      setErrorMessage(error instanceof Error ? error.message : "Image search failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processFile(file);
    }

    event.target.value = "";
  };

  const showPanel = isPanelOpen || isDragActive || Boolean(previewDataUrl) || Boolean(response) || recentSearches.length > 0;

  return (
    <div
      className="space-y-3"
      onDragEnter={() => {
        setIsDragActive(true);
        setIsPanelOpen(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragActive(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return;
        }

        setIsDragActive(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragActive(false);
        const file = event.dataTransfer.files?.[0];
        if (file) {
          void processFile(file);
        }
      }}
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          ref={searchInputRef}
          type="search"
          placeholder="Search restaurants or cuisines..."
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className={cn(
            "bg-white border-gray-200 pl-10 pr-36",
            isDragActive && "border-orange-400 ring-2 ring-orange-100",
          )}
          data-testid="input-food-search"
        />
        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-1">
          <button
            type="button"
            onClick={handleVoiceSearch}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors",
              isListening
                ? "bg-red-100 text-red-600 animate-pulse"
                : "text-gray-500 hover:bg-orange-50 hover:text-orange-500",
            )}
            aria-label="Search using voice"
            aria-pressed={isListening}
            data-testid="button-food-voice-search"
          >
            <Mic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsPanelOpen(true);
              uploadInputRef.current?.click();
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-orange-50 hover:text-orange-500"
            aria-label="Upload food image"
            data-testid="button-food-image-upload"
          >
            <ImagePlus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsPanelOpen(true);
              cameraInputRef.current?.click();
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-orange-50 hover:text-orange-500"
            aria-label="Capture food image"
            data-testid="button-food-image-camera"
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(event) => {
            void handleFileSelection(event);
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/png,image/jpeg"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            void handleFileSelection(event);
          }}
        />
      </div>

      <span className="sr-only" aria-live="polite">{voiceAnnouncement}</span>

      {showPanel ? (
        <div className="space-y-3">
          <Card className={cn("border border-dashed p-4", isDragActive ? "border-orange-400 bg-orange-50/70" : "border-orange-200 bg-white") }>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Search food by photo</p>
                <p className="mt-1 text-xs text-gray-500">
                  Drop a PNG or JPEG here, upload from gallery, or capture from your camera.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => uploadInputRef.current?.click()}
                  className="border-orange-200 text-orange-600 hover:bg-orange-50"
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  Upload
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => cameraInputRef.current?.click()}
                  className="bg-orange-500 text-white hover:bg-orange-600"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Camera
                </Button>
              </div>
            </div>

            {previewDataUrl ? (
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50/70 p-3">
                <img
                  src={previewDataUrl}
                  alt="Food search preview"
                  className="h-20 w-20 rounded-2xl object-cover"
                  data-testid="img-food-search-preview"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">Preview ready</p>
                  <p className="mt-1 text-xs text-gray-500">
                    The image will be matched against detected dish names and your menu data.
                  </p>
                  {response?.cached ? (
                    <p className="mt-2 text-xs font-medium text-emerald-600">Loaded from recent search cache.</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={resetImageSearch}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white hover:text-gray-700"
                  aria-label="Clear image search"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            {isProcessing ? (
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                Identifying the dish and searching matching menu items...
              </div>
            ) : null}

            {errorMessage ? (
              <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {errorMessage}
              </div>
            ) : null}
          </Card>

          {response ? (
            <div className="space-y-3">
              <Card className="border-gray-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
                    <Sparkles className="h-3.5 w-3.5" />
                    Detected food
                  </div>
                  {response.detectedItems.length > 0 ? (
                    response.detectedItems.map((item) => (
                      <Badge key={item} variant="secondary" className="rounded-full bg-orange-100 text-orange-700 hover:bg-orange-100">
                        {item}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">No keywords detected.</span>
                  )}
                </div>

                {response.predictions.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {response.predictions.map((prediction) => (
                      <span
                        key={`${prediction.name}-${prediction.confidence}`}
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600"
                      >
                        {prediction.name} · {formatConfidence(prediction.confidence)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </Card>

              {response.results.length === 0 ? (
                <Card className="border-gray-200 p-6 text-center">
                  <p className="text-base font-semibold text-gray-900">No matching food items found</p>
                  <p className="mt-2 text-sm text-gray-500">
                    {response.message ?? "Try a clearer dish photo or search with a different angle."}
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {response.results.map((result) => (
                    <Link key={result.id ?? result._id ?? `${result.restaurantId}-${result.name}`} href={`/food/restaurant/${result.restaurantId}`}>
                      <Card className="h-full overflow-hidden border-gray-200 transition-all hover:-translate-y-0.5 hover:shadow-md" data-testid={`card-food-image-result-${result.id ?? result._id ?? result.name}`}>
                        <div className="aspect-[4/3] bg-gray-100">
                          {result.image ? (
                            <img src={result.image} alt={result.name} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-100 to-yellow-100 text-sm font-semibold text-gray-500">
                              {result.name.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900">{result.name}</p>
                              <p className="truncate text-xs text-gray-500">{result.restaurantName}</p>
                            </div>
                            <span className="rounded-full bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-600">
                              {formatPrice(result.price)}
                            </span>
                          </div>
                          {result.description ? (
                            <p className="line-clamp-2 text-xs text-gray-500">{result.description}</p>
                          ) : null}
                          <div className="flex flex-wrap gap-1.5">
                            {result.category ? (
                              <Badge variant="outline" className="rounded-full border-gray-200 text-[11px] text-gray-600">
                                {result.category}
                              </Badge>
                            ) : null}
                            {result.matchKeywords?.slice(0, 2).map((keyword) => (
                              <Badge key={keyword} variant="secondary" className="rounded-full bg-emerald-50 text-[11px] text-emerald-700 hover:bg-emerald-50">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {recentSearches.length > 0 ? (
            <Card className="border-gray-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <History className="h-4 w-4 text-orange-500" />
                  Recent image searches
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    saveRecentImageSearches([]);
                    setRecentSearches([]);
                  }}
                  className="h-8 text-xs font-semibold text-gray-500 hover:bg-gray-100"
                >
                  Clear
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {recentSearches.map((entry) => (
                  <button
                    key={entry.cacheKey}
                    type="button"
                    onClick={() => restoreRecentSearch(entry)}
                    className="flex items-center gap-3 rounded-2xl border border-gray-200 p-3 text-left transition-colors hover:border-orange-200 hover:bg-orange-50/50"
                  >
                    <img src={entry.previewDataUrl} alt="Recent search" className="h-14 w-14 rounded-xl object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {entry.response.detectedItems.join(", ") || "Unknown dish"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {entry.response.results.length} matches · {new Date(entry.searchedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}