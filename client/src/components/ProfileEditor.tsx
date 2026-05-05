import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ProfileEditor({ user }: { user: any }) {
  const { toast } = useToast();
  const [name, setName] = useState(user.name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [email, setEmail] = useState(user.email || "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(user.avatar || null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string }>({});

  useEffect(() => {
    setName(user.name || "");
    setPhone(user.phone || "");
    setEmail(user.email || "");
    setPreview(user.avatar || null);
  }, [user]);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handleSaveProfile() {
    const newErrors: any = {};
    if (!name || name.trim().length < 2) newErrors.name = "Please enter your name (min 2 chars)";
    if (phone && !/^\+?[0-9\s-]{7,15}$/.test(phone)) newErrors.phone = "Enter a valid phone number";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Enter a valid email address";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      setSaving(true);
      await apiRequest("PUT", "/api/profile/update", { name: name.trim(), phone: phone.trim() || null, email: email.trim() || null });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "Profile updated" });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message || String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadAvatar() {
    if (!file) return toast({ title: "Select an image first", variant: "destructive" });
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("avatar", file as File);
      const res = await fetch("/api/profile/upload-avatar-file", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      // Update client cache
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "Avatar uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || String(err), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  const completeness = Math.round((
    (name && name.trim().length > 0 ? 25 : 0) +
    (phone ? 25 : 0) +
    (email ? 25 : 0) +
    (preview ? 25 : 0)
  ));

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Edit Profile</h3>
        <div className="text-sm text-gray-500">Completeness: {completeness}%</div>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-4">
        <div style={{ width: `${completeness}%` }} className="h-2 bg-primary"></div>
      </div>

      <div className="flex gap-4 items-start">
        <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <div className="text-gray-400">No Image</div>
          )}
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-600">Profile photo</label>
          <input
            id="avatar-file"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
            className="mt-1 text-sm"
          />
          <div className="mt-2 flex gap-2">
            <Button onClick={handleUploadAvatar} disabled={uploading || !file}>
              {uploading ? "Uploading..." : "Upload Avatar"}
            </Button>
            <Button variant="ghost" onClick={() => { setFile(null); setPreview(user.avatar || null); }}>
              Reset
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Name</label>
          <Input value={name} onChange={(e: any) => setName(e.target.value)} />
          {errors.name && <div className="text-xs text-red-600 mt-1">{errors.name}</div>}
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Phone</label>
          <Input value={phone} onChange={(e: any) => setPhone(e.target.value)} />
          {errors.phone && <div className="text-xs text-red-600 mt-1">{errors.phone}</div>}
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Email</label>
          <Input value={email} onChange={(e: any) => setEmail(e.target.value)} />
          {errors.email && <div className="text-xs text-red-600 mt-1">{errors.email}</div>}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button onClick={handleSaveProfile} disabled={saving || Object.keys(errors).length > 0}>{saving ? "Saving..." : "Save Profile"}</Button>
        <Button variant="ghost" onClick={() => { setName(user.name || ""); setPhone(user.phone || ""); setEmail(user.email || ""); setFile(null); setPreview(user.avatar || null); setErrors({}); }}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
