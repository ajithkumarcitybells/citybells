import { useState, useCallback } from "react";
import type { UppyFile } from "@uppy/core";

interface UploadResponse {
  objectPath: string;
  fileName?: string;
  originalName?: string;
}

interface UseUploadOptions {
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useUpload(options: UseUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  const uploadFile = useCallback(
    async (file: File): Promise<UploadResponse | null> => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      try {
        setProgress(10);

        let result: UploadResponse;

        try {
          const urlRes = await fetch("/api/uploads/request-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: file.name,
              size: file.size,
              contentType: file.type || "application/octet-stream",
            }),
          });

          if (!urlRes.ok) throw new Error("Presigned URL failed");

          const data = await urlRes.json();
          setProgress(30);

          const putRes = await fetch(data.uploadURL, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type || "application/octet-stream" },
          });

          if (!putRes.ok) throw new Error("PUT to presigned URL failed");

          result = { objectPath: data.objectPath };
        } catch {
          setProgress(20);
          const base64Data = await fileToBase64(file);
          setProgress(50);

          const directRes = await fetch("/api/uploads/direct", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: file.name,
              fileData: base64Data,
              contentType: file.type || "application/octet-stream",
            }),
          });

          if (!directRes.ok) {
            throw new Error("Upload failed");
          }

          result = await directRes.json();
        }

        setProgress(100);
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Upload failed");
        setError(error);
        options.onError?.(error);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [options]
  );

  const getUploadParameters = useCallback(
    async (
      file: UppyFile<Record<string, unknown>, Record<string, unknown>>
    ): Promise<{
      method: "PUT";
      url: string;
      headers?: Record<string, string>;
    }> => {
      const response = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type || "application/octet-stream",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }

      const data = await response.json();
      return {
        method: "PUT",
        url: data.uploadURL,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      };
    },
    []
  );

  return {
    uploadFile,
    getUploadParameters,
    isUploading,
    error,
    progress,
  };
}
