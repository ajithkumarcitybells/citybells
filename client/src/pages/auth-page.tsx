import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Redirect, Link } from "wouter";
import { Eye, EyeOff, User, Mail, Phone, Lock, Store, Smartphone, ChevronLeft, Loader2, ShoppingBag, Truck, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest, queryClient } from "@/lib/queryClient";
import cityBellLogo from "@assets/citybells-logo_1769903304782.png";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid 10-digit phone number").max(10, "Phone number must be 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

type ExtendedRegisterFormData = RegisterFormData & {
  licenseNumber?: string;
  vehicleTypeId?: string;
  vehicleNumber?: string;
};

type PhoneStep = "phone" | "otp" | "pin-login" | "pin-setup" | "pin-register";

function PhonePinDialog({
  open,
  onOpenChange,
  onSuccess,
  userType,
  vehicleTypes: vehicleTypesProp,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (user: any) => void;
  userType?: "customer" | "driver";
  vehicleTypes?: any[];
}) {
  const [step, setStep] = useState<PhoneStep>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userName, setUserName] = useState("");
  const [pin, setPin] = useState("");
  const [otp, setOtp] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [confirmPin, setConfirmPin] = useState("");
  const [newName, setNewName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [vehicleTypeId, setVehicleTypeId] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const vehicleTypes = vehicleTypesProp || [];
  const [licenseTouched, setLicenseTouched] = useState(false);
  const [vehicleTypeTouched, setVehicleTypeTouched] = useState(false);
  const [pinTouched, setPinTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [driverPhoto, setDriverPhoto] = useState<string | null>(null);
  const [driverIdProof, setDriverIdProof] = useState<string | null>(null);
  const { toast } = useToast();
  

  // map file id -> objectPath returned by presign endpoint
  const uploadObjectMap: Record<string, string> = {};

  const makeOnGetUploadParameters = (fieldName: 'photo' | 'idProof') => async (file: any) => {
    const res = await fetch('/api/uploads/request-url', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }) });
    if (!res.ok) throw new Error('Failed to request upload URL');
    const data = await res.json();
    // store objectPath so we can map completed uploads and remember which field it is for
    try {
      const key = file.id || file.name;
      if (data.objectPath) uploadObjectMap[key] = JSON.stringify({ path: data.objectPath, field: fieldName });
    } catch (e) {}
    return { method: 'PUT' as const, url: data.uploadURL, headers: {} };
  };

  const onUploadComplete = (result: any) => {
    try {
      for (const f of result.successful || []) {
        const id = f.id || f.name;
        const raw = uploadObjectMap[id];
        if (!raw) continue;
        let parsed: { path: string; field: string } | null = null;
        try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
        if (!parsed) continue;
        if (parsed.field === 'photo') setDriverPhoto(parsed.path);
        else if (parsed.field === 'idProof') setDriverIdProof(parsed.path);
      }
    } catch (e:any) { console.error('Upload complete handler failed', e); }
  };

  const resetState = () => {
    setStep("phone");
    setPhoneNumber("");
    setUserName("");
    setPin("");
    setOtp("");
    setResendCountdown(0);
    setConfirmPin("");
    setNewName("");
    setError("");
    setShowPin(false);
    setLicenseNumber("");
    setVehicleTypeId("");
    setVehicleNumber("");
  };

  useEffect(() => {
    if (!open || step !== "otp" || resendCountdown <= 0) return;
    const timer = window.setTimeout(() => setResendCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [open, step, resendCountdown]);

  const requestOtp = async () => {
    const res = await apiRequest("POST", "/api/auth/request-otp", {
      phone: phoneNumber,
      role: userType || "customer",
    });
    await res.json();
    setStep("otp");
    setOtp("");
    setResendCountdown(30);
  };

  const handlePhoneSubmit = async () => {
    if (phoneNumber.length !== 10 || !/^\d{10}$/.test(phoneNumber)) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await requestOtp();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the 6-digit OTP");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const res = await apiRequest("POST", "/api/auth/verify-otp", {
        phone: phoneNumber,
        otp,
        role: userType || "customer",
      });
      const user = await res.json();
      queryClient.setQueryData(["/api/user"], user);
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Welcome!", description: `Logged in as ${user.name || phoneNumber}` });
      onSuccess(user);
      onOpenChange(false);
      resetState();
    } catch (err: any) {
      setError(err.message || "OTP verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    setIsLoading(true);
    setError("");
    try {
      await requestOtp();
      toast({ title: "OTP sent", description: `A new OTP was sent to +91 ${phoneNumber}` });
    } catch (err: any) {
      setError(err.message || "Could not resend OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsePinInstead = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await apiRequest("POST", "/api/check-phone", { phone: phoneNumber });
      const data = await res.json();
      if (data.exists && data.hasPinSet) {
        setUserName(data.name || "");
        setStep("pin-login");
      } else if (data.exists && !data.hasPinSet) {
        setUserName(data.name || "");
        setStep("pin-setup");
      } else {
        setStep("pin-register");
      }
    } catch (err: any) {
      setError(err.message || "PIN login is unavailable right now");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinLogin = async () => {
    if (pin.length < 4) {
      setError("Please enter your full PIN");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      let user;
      if (userType === 'driver') {
        const res = await apiRequest('POST', '/api/driver/login', { phone: phoneNumber, pin });
        user = await res.json();
      } else {
        const res = await apiRequest("POST", "/api/login-phone", { phone: phoneNumber, pin });
        user = await res.json();
      }
      queryClient.setQueryData(["/api/user"], user);
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Welcome back!", description: `Logged in as ${user.name || phoneNumber}` });
      onSuccess(user);
      onOpenChange(false);
      resetState();
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSetup = async () => {
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs don't match");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const res = await apiRequest("POST", "/api/set-pin", {
        phone: phoneNumber,
        pin,
      });
      const user = await res.json();
      queryClient.setQueryData(["/api/user"], user);
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "PIN set successfully!", description: `Welcome, ${user.name || phoneNumber}!` });
      onSuccess(user);
      onOpenChange(false);
      resetState();
    } catch (err: any) {
      setError(err.message || "Failed to set PIN");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinRegister = async () => {
    if (!newName || newName.length < 2) {
      setError("Please enter your name");
      return;
    }
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs don't match");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      let user;
      if (userType === 'driver') {
        if (!licenseNumber) { setError('License number is required'); setIsLoading(false); return; }
        if (!vehicleTypeId) { setError('Vehicle type is required'); setIsLoading(false); return; }
        const payload = { phone: phoneNumber, pin, name: newName, licenseNumber, vehicleTypeId, vehicleNumber };
        try { console.debug('[debug] client->POST /api/driver/register payload (masked)', { ...payload, pin: payload.pin ? '<masked>' : undefined }); } catch (e:any) { console.error(e); }
        const res = await apiRequest('POST', '/api/driver/register', payload);
        user = await res.json();
      } else {
        const res = await apiRequest("POST", "/api/register-phone", {
          phone: phoneNumber,
          pin,
          name: newName,
        });
        user = await res.json();
      }
      queryClient.setQueryData(["/api/user"], user);
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Account created!", description: `Welcome, ${user.name}!` });
      onSuccess(user);
      onOpenChange(false);
      resetState();
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const isPinValid = /^\d{4,6}$/.test(pin);
  const pinsMatch = pin === confirmPin;
  const isDriverFieldsValid = userType !== 'driver' || (licenseNumber.trim().length >= 4 && vehicleTypeId.trim().length > 0);
  const canRegister = !isLoading && newName.trim().length >= 2 && isPinValid && pinsMatch && isDriverFieldsValid;

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) resetState();
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-md">
        {step === "phone" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Login with Phone OTP
              </DialogTitle>
              <DialogDescription>
                Enter your phone number and we will send a one-time password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium text-foreground">Phone Number</label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">+91</span>
                  <Input
                    type="tel"
                    placeholder="Enter 10-digit number"
                    value={phoneNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setPhoneNumber(val);
                      setError("");
                    }}
                    className="pl-12 h-12 text-lg tracking-wider"
                    maxLength={10}
                    autoFocus
                    data-testid="input-phone-pin"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive" data-testid="text-phone-error">{error}</p>}
              <Button
                className="w-full h-12"
                onClick={handlePhoneSubmit}
                disabled={phoneNumber.length !== 10 || isLoading}
                data-testid="button-phone-continue"
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Checking...</>
                ) : (
                  "Send OTP"
                )}
              </Button>
            </div>
          </>
        )}

        {step === "otp" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Enter OTP
              </DialogTitle>
              <DialogDescription>
                Enter the OTP sent to +91 {phoneNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground -ml-2"
                onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
                data-testid="button-change-phone-otp"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                +91 {phoneNumber} · Change
              </Button>

              <div className="flex flex-col items-center gap-3">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(val) => { setOtp(val); setError(""); }}
                  data-testid="input-phone-otp"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {error && <p className="text-sm text-destructive text-center" data-testid="text-otp-error">{error}</p>}

              <Button
                className="w-full h-12"
                onClick={handleVerifyOtp}
                disabled={otp.length !== 6 || isLoading}
                data-testid="button-verify-otp"
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying...</>
                ) : (
                  "Verify & Continue"
                )}
              </Button>

              <div className="flex items-center justify-between gap-2 text-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResendOtp}
                  disabled={resendCountdown > 0 || isLoading}
                  data-testid="button-resend-otp"
                >
                  {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend OTP"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUsePinInstead}
                  disabled={isLoading}
                  data-testid="button-use-pin"
                >
                  Use PIN instead
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "pin-login" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Enter Your PIN
              </DialogTitle>
              <DialogDescription>
                {userName ? `Welcome back, ${userName}!` : `Account found for +91 ${phoneNumber}`}. Enter your PIN to login.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground -ml-2"
                onClick={() => { setStep("phone"); setPin(""); setError(""); }}
                data-testid="button-change-phone"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                +91 {phoneNumber}  · Change
              </Button>

              <div className="flex flex-col items-center gap-3">
                <label className="text-sm font-medium text-foreground">Your Login PIN</label>
                {showPin ? (
                  <Input
                    type="text"
                    value={pin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setPin(val);
                      setError("");
                    }}
                    placeholder="Enter PIN"
                    className="text-center text-2xl tracking-[0.5em] h-14 max-w-[200px] font-mono"
                    maxLength={6}
                    autoFocus
                    data-testid="input-pin-login"
                  />
                ) : (
                  <InputOTP
                    maxLength={6}
                    value={pin}
                    onChange={(val) => { setPin(val); setError(""); }}
                    data-testid="input-pin-login-otp"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => setShowPin(!showPin)}
                  data-testid="button-toggle-pin-visibility"
                >
                  {showPin ? <><EyeOff className="h-3 w-3 mr-1" /> Hide PIN</> : <><Eye className="h-3 w-3 mr-1" /> Show PIN</>}
                </Button>
              </div>

              {error && <p className="text-sm text-destructive text-center" data-testid="text-pin-error">{error}</p>}

              <Button
                className="w-full h-12"
                onClick={handlePinLogin}
                disabled={pin.length < 4 || isLoading}
                data-testid="button-pin-login"
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Logging in...</>
                ) : (
                  "Login"
                )}
              </Button>
            </div>
          </>
        )}

        {step === "pin-setup" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Set Your Login PIN
              </DialogTitle>
              <DialogDescription>
                {userName ? `Hi ${userName}! ` : ""}Set a 4-6 digit PIN for quick phone login.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground -ml-2"
                onClick={() => { setStep("phone"); setPin(""); setConfirmPin(""); setError(""); }}
                data-testid="button-change-phone-setup"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                +91 {phoneNumber}  · Change
              </Button>

              <div className="flex flex-col items-center gap-2">
                <label className="text-sm font-medium text-foreground self-start">Set a Login PIN (4-6 digits)</label>
                <InputOTP
                  maxLength={6}
                  value={pin}
                  onChange={(val) => { setPin(val); setError(""); }}
                  data-testid="input-setup-pin"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="flex flex-col items-center gap-2">
                <label className="text-sm font-medium text-foreground self-start">Confirm PIN</label>
                <InputOTP
                  maxLength={6}
                  value={confirmPin}
                  onChange={(val) => { setConfirmPin(val); setError(""); }}
                  data-testid="input-setup-confirm-pin"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {error && <p className="text-sm text-destructive text-center" data-testid="text-setup-error">{error}</p>}

              <Button
                className="w-full h-12"
                onClick={handlePinSetup}
                disabled={pin.length < 4 || confirmPin.length < 4 || isLoading}
                data-testid="button-pin-setup"
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Setting PIN...</>
                ) : (
                  "Set PIN & Login"
                )}
              </Button>
            </div>
          </>
        )}

        {step === "pin-register" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Set Up Your Account
              </DialogTitle>
              <DialogDescription>
                No account found for +91 {phoneNumber}. Create one in seconds!
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground -ml-2"
                onClick={() => { setStep("phone"); setPin(""); setConfirmPin(""); setNewName(""); setError(""); }}
                data-testid="button-change-phone-register"
              >
                Change Phone
              </Button>

              <div>
                <label className="text-sm font-medium">Your Name</label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter your full name"
                    value={newName}
                    onChange={(e) => { setNewName(e.target.value); setError(""); }}
                    className="pl-10 h-12"
                    autoFocus
                    data-testid="input-name-phone"
                  />
                </div>
              </div>

              {userType === 'driver' && (
                <div className="space-y-3 pt-3">
                  <div>
                    <label className="text-sm font-medium">License Number <span className="text-destructive">*</span></label>
                    <Input
                      placeholder="License number"
                      value={licenseNumber}
                      onChange={(e) => { setLicenseNumber(e.target.value); setError(""); }}
                      onBlur={() => setLicenseTouched(true)}
                      aria-invalid={licenseTouched && licenseNumber.trim().length < 4}
                      className="mt-1 h-11"
                    />
                    {licenseTouched && licenseNumber.trim().length < 4 && (
                      <p className="text-xs text-destructive mt-1">Please enter a valid license number (min 4 chars).</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Vehicle Type <span className="text-destructive">*</span></label>
                    <select
                      className="w-full border p-2 h-11 mt-1"
                      value={vehicleTypeId}
                      onChange={(e) => { setVehicleTypeId(e.target.value); setError(""); }}
                      onBlur={() => setVehicleTypeTouched(true)}
                      aria-invalid={vehicleTypeTouched && !vehicleTypeId}
                    >
                      <option value="">Select vehicle type</option>
                      {vehicleTypes.map(v => (<option key={v.id || v._id} value={v.id || v._id}>{v.name}</option>))}
                    </select>
                    {vehicleTypeTouched && !vehicleTypeId && (
                      <p className="text-xs text-destructive mt-1">Please choose a vehicle type.</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Vehicle Number</label>
                    <Input placeholder="Vehicle number" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} className="mt-1 h-11" />
                  </div>
                  <div className="pt-2">
                    <label className="text-sm font-medium">Driver Photo (optional)</label>
                    <div className="flex items-center gap-2 mt-2">
                      <ObjectUploader
                        onGetUploadParameters={makeOnGetUploadParameters('photo')}
                        onComplete={onUploadComplete}
                        buttonClassName="h-10"
                      >
                        Upload Photo
                      </ObjectUploader>
                      {driverPhoto && (
                        <div className="flex items-center gap-2">
                          <img src={driverPhoto} alt="driver" className="h-10 w-10 rounded" />
                          <button className="text-sm text-destructive" onClick={() => setDriverPhoto(null)}>Remove</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="pt-2">
                    <label className="text-sm font-medium">ID Proof (optional)</label>
                    <div className="flex items-center gap-2 mt-2">
                      <ObjectUploader
                        onGetUploadParameters={makeOnGetUploadParameters('idProof')}
                        onComplete={onUploadComplete}
                        buttonClassName="h-10"
                      >
                        Upload ID
                      </ObjectUploader>
                      {driverIdProof && (
                        <div className="flex items-center gap-2">
                          <a href={driverIdProof} target="_blank" rel="noreferrer" className="text-sm text-primary underline">View</a>
                          <button className="text-sm text-destructive" onClick={() => setDriverIdProof(null)}>Remove</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col items-center gap-2">
                <label className="text-sm font-medium text-foreground self-start">Set a Login PIN (4-6 digits)</label>
                <InputOTP
                  maxLength={6}
                  value={pin}
                  onChange={(val) => { setPin(val); setError(""); }}
                  onBlur={() => setPinTouched(true)}
                  data-testid="input-set-pin"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="flex flex-col items-center gap-2">
                <label className="text-sm font-medium text-foreground self-start">Confirm PIN</label>
                <InputOTP
                  maxLength={6}
                  value={confirmPin}
                  onChange={(val) => { setConfirmPin(val); setError(""); }}
                  onBlur={() => setConfirmTouched(true)}
                  data-testid="input-confirm-pin"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {error && <p className="text-sm text-destructive text-center" data-testid="text-register-error">{error}</p>}
              {(pinTouched || confirmTouched) && pin.length > 0 && pin.length < 4 && (
                <p className="text-xs text-destructive text-center">PIN must be 4-6 digits.</p>
              )}
              {(pinTouched || confirmTouched) && pin.length >=4 && confirmPin.length > 0 && pin !== confirmPin && (
                <p className="text-xs text-destructive text-center">PINs do not match.</p>
              )}

              <Button
                className="w-full h-12"
                onClick={handlePinRegister}
                disabled={!canRegister}
                data-testid="button-pin-register"
                aria-disabled={!canRegister}
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating Account...</>
                ) : (
                  "Create Account"
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState<"customer"|"driver">("customer");
  const [showPassword, setShowPassword] = useState(false);
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const { user, loginMutation, registerMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const navigatedRef = React.useRef(false);
  const prevUserIdRef = React.useRef<string | null>(null);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const registerForm = useForm<ExtendedRegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "", licenseNumber: "", vehicleTypeId: "", vehicleNumber: "" },
    mode: "onBlur",
  });
  const { toast } = useToast();

  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await apiRequest('GET', '/api/taxi/vehicle-types');
        const data = await r.json();
        setVehicleTypes(data || []);
      } catch (e:any) { console.error(e); }
    })();
  }, []);

  // main register form upload state/helpers (used by the full register form)
  const [driverPhoto, setDriverPhoto] = useState<string | null>(null);
  const [driverIdProof, setDriverIdProof] = useState<string | null>(null);
  const uploadObjectMapMain: Record<string, string> = {};
  const makeOnGetUploadParametersMain = (fieldName: 'photo' | 'idProof') => async (file: any) => {
    const res = await fetch('/api/uploads/request-url', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }) });
    if (!res.ok) throw new Error('Failed to request upload URL');
    const data = await res.json();
    try { const key = file.id || file.name; if (data.objectPath) uploadObjectMapMain[key] = JSON.stringify({ path: data.objectPath, field: fieldName }); } catch (e) {}

    return { method: 'PUT' as const, url: data.uploadURL as string, headers: {} };
  };
  const onUploadCompleteMain = (result: any) => {
    try {
      for (const f of result.successful || []) {
        const id = f.id || f.name;
        const raw = uploadObjectMapMain[id];
        if (!raw) continue;
        let parsed: { path: string; field: string } | null = null;
        try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
        if (!parsed) continue;
        if (parsed.field === 'photo') setDriverPhoto(parsed.path);
        else if (parsed.field === 'idProof') setDriverIdProof(parsed.path);
      }
    } catch (e:any) { console.error('Upload complete handler failed', e); }
  };

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const role = params.get('role');
      if (role === 'driver') setUserType('driver');
    } catch (e:any) { console.error(e); }
  }, []);

  useEffect(() => {
    if (!user) return;
    // Avoid repeated navigation if we've already redirected for this user
    try {
      const params = new URLSearchParams(window.location.search);
      const requestedRole = params.get('role');
      const path = window.location.pathname || '';

      if (path === '/auth' && requestedRole === 'driver' && (user as any).role !== 'driver') {
        setUserType('driver');
        navigatedRef.current = false;
        return;
      }

      const currentUserId = (user as any).id || null;
      if (prevUserIdRef.current === currentUserId && navigatedRef.current) return;
      prevUserIdRef.current = currentUserId;
      navigatedRef.current = true;

      if ((user as any).role === 'driver') {
        if (path !== '/taxi/driver') setLocation('/taxi/driver');
        return;
      }
      if (user.isVendor) {
        if (path !== '/seller/dashboard') setLocation('/seller/dashboard');
        return;
      }
      if (user.isAdmin) {
        if (path !== '/admin') setLocation('/admin');
        return;
      }
      if (path !== '/') setLocation('/');
    } catch (e:any) { console.error(e); }
  }, [user]);

  const handleAuthSuccess = (u: any) => {
    navigatedRef.current = true;
    if ((u as any).role === 'driver') {
      setLocation("/taxi/driver");
      return;
    }
    if (u?.isVendor) {
      setLocation("/seller/dashboard");
    } else if (u?.isAdmin) {
      setLocation("/admin");
    } else {
      setLocation("/");
    }
  };

  const onLoginSubmit = (data: LoginFormData) => {
    if (userType === 'driver') {
      // driver login via API
      (async () => {
        try {
          const res = await apiRequest('POST', '/api/driver/login', data);
          const u = await res.json();
          queryClient.setQueryData(['/api/user'], u);
          await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          handleAuthSuccess(u);
        } catch (err: any) {
          console.error(err);
          toast({ title: 'Login failed', description: err?.message || 'Could not login as driver', variant: 'destructive' });
        }
      })();
      return;
    }
    loginMutation.mutate(data, { onSuccess: handleAuthSuccess });
  };

  const onRegisterSubmit = (data: RegisterFormData & any) => {
    const { confirmPassword, ...registerData } = data;
    if (userType === 'driver') {
      // call driver register endpoint
      (async () => {
        try {
          try { console.debug('[debug] onRegisterSubmit - react-hook-form values', registerForm.getValues()); } catch (e:any) { console.error(e); }
          try { console.debug('[debug] onRegisterSubmit - data arg', data); } catch (e:any) { console.error(e); }
          // ensure latest values from the form are used (handles dynamic fields)
          await registerForm.trigger();
          const values = registerForm.getValues();
          const payload = {
            name: values.name || data.name,
            email: values.email || data.email,
            phone: values.phone || data.phone,
            password: values.password || data.password,
            licenseNumber: values.licenseNumber ?? "",
            vehicleTypeId: values.vehicleTypeId ?? "",
            vehicleNumber: values.vehicleNumber ?? "",
            photo: driverPhoto,
            idProof: driverIdProof,
          };
          // client-side guard
          if (!payload.licenseNumber) { toast({ title: 'License required', description: 'Please enter your license number', variant: 'destructive' }); return; }
          if (!payload.vehicleTypeId) { toast({ title: 'Vehicle type required', description: 'Please select a vehicle type', variant: 'destructive' }); return; }
            try { console.debug('[debug] client->POST /api/driver/register payload (masked)', { ...payload, password: payload.password ? '<masked>' : undefined }); } catch (e:any) { console.error(e); }
          const res = await apiRequest('POST', '/api/driver/register', payload);
          const u = await res.json();
          queryClient.setQueryData(['/api/user'], u);
          await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          handleAuthSuccess(u);
        } catch (err: any) {
          console.error(err);
          toast({ title: 'Registration failed', description: err?.message || 'Could not create driver account', variant: 'destructive' });
        }
      })();
      return;
    }
    registerMutation.mutate({
      username: data.email,
      password: data.password,
      name: data.name,
      email: data.email,
      phone: data.phone,
    }, { onSuccess: handleAuthSuccess });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left: Auth Form ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <img src={cityBellLogo} alt="City Bell" className="h-10 w-auto" />
            <span className="text-xl font-bold text-red-600">CITY BELL</span>
          </div>

          <h2 className="text-2xl font-bold mb-1">
            {isLogin ? "Welcome back!" : "Create an account"}
          </h2>
          <div className="flex gap-2 mb-4" role="tablist" aria-label="Login role">
            <button
              className={`px-3 py-1 rounded ${userType==='customer' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
              onClick={() => setUserType('customer')}
              role="tab"
              aria-selected={userType==='customer'}
            >👤 Customer</button>
            <button
              className={`px-3 py-1 rounded ${userType==='driver' ? 'bg-yellow-500 text-white' : 'bg-gray-100'}`}
              onClick={() => setUserType('driver')}
              role="tab"
              aria-selected={userType==='driver'}
            >🚖 Driver</button>
          </div>
          <p className="text-muted-foreground text-sm mb-6">
            {isLogin
              ? "Login to access your cart, wishlist and orders"
              : "Sign up to start shopping fresh groceries"}
          </p>

          {/* Phone PIN button */}
          {isLogin && (
            <Button
              variant="outline"
              className="w-full h-12 mb-4 font-semibold gap-2"
              onClick={() => setShowPhoneDialog(true)}
            >
              <Smartphone className="h-5 w-5" />
              Login with Phone OTP
            </Button>
          )}

          {isLogin && (
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground">or login with email</span>
              </div>
            </div>
          )}

          {/* ── Login Form ── */}
          {isLogin ? (
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email / Username</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Enter your email or username" className="pl-10 h-11" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="pl-10 pr-10 h-11"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Logging in..." : "Login"}
                </Button>
              </form>
            </Form>
          ) : (
            /* ── Register Form ── */
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-3">
              <div>
                <label className="text-sm font-medium">Full Name <span className="text-destructive">*</span></label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <Input placeholder="Enter your full name" className="pl-10 h-11" {...registerForm.register("name")} />
                </div>
                {registerForm.formState.errors.name && (
                  <p className="text-sm mt-1 text-destructive">{registerForm.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Email <span className="text-destructive">*</span></label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <Input type="email" placeholder="Enter your email" className="pl-10 h-11" {...registerForm.register("email")} />
                </div>
                {registerForm.formState.errors.email && (
                  <p className="text-sm mt-1 text-destructive">{registerForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Phone <span className="text-destructive">*</span></label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <Input type="tel" placeholder="10-digit phone number" className="pl-10 h-11" maxLength={10} {...registerForm.register("phone")} />
                </div>
                {registerForm.formState.errors.phone && (
                  <p className="text-sm mt-1 text-destructive">{registerForm.formState.errors.phone.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Password <span className="text-destructive">*</span></label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 6 characters"
                    className="pl-10 pr-10 h-11"
                    {...registerForm.register("password")}
                  />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {registerForm.formState.errors.password && (
                  <p className="text-sm mt-1 text-destructive">{registerForm.formState.errors.password.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Confirm Password <span className="text-destructive">*</span></label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    className="pl-10 pr-10 h-11"
                    {...registerForm.register("confirmPassword")}
                  />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-sm mt-1 text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              {userType === 'driver' && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-sm font-medium">License Number <span className="text-destructive">*</span></label>
                    <Input placeholder="Enter license number" className="h-11" {...registerForm.register('licenseNumber' as any)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Vehicle Type <span className="text-destructive">*</span></label>
                    <select className="w-full border p-2 h-11" {...registerForm.register('vehicleTypeId' as any)}>
                      <option value="">Select vehicle type</option>
                      {vehicleTypes.map(v => (<option key={v.id || v._id} value={v.id || v._id}>{v.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Vehicle Number <span className="text-destructive">*</span></label>
                    <Input placeholder="Vehicle number" className="h-11" {...registerForm.register('vehicleNumber' as any)} />
                  </div>
                  <div className="pt-2">
                    <label className="text-sm font-medium">Driver Photo (optional)</label>
                    <div className="flex items-center gap-2 mt-2">
                      <ObjectUploader
                        onGetUploadParameters={makeOnGetUploadParametersMain('photo')}
                        onComplete={onUploadCompleteMain}
                        buttonClassName="h-10"
                      >
                        Upload Photo
                      </ObjectUploader>
                      {driverPhoto && (
                        <div className="flex items-center gap-2">
                          <img src={driverPhoto} alt="driver" className="h-10 w-10 rounded" />
                          <button className="text-sm text-destructive" onClick={() => setDriverPhoto(null)}>Remove</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="pt-2">
                    <label className="text-sm font-medium">ID Proof (optional)</label>
                    <div className="flex items-center gap-2 mt-2">
                      <ObjectUploader
                        onGetUploadParameters={makeOnGetUploadParametersMain('idProof')}
                        onComplete={onUploadCompleteMain}
                        buttonClassName="h-10"
                      >
                        Upload ID
                      </ObjectUploader>
                      {driverIdProof && (
                        <div className="flex items-center gap-2">
                          <a href={driverIdProof} target="_blank" rel="noreferrer" className="text-sm text-primary underline">View</a>
                          <button className="text-sm text-destructive" onClick={() => setDriverIdProof(null)}>Remove</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-3 text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 font-semibold gap-2"
                onClick={() => setShowPhoneDialog(true)}
              >
                <Smartphone className="h-5 w-5" />
                Quick Sign Up with Phone OTP
              </Button>

              <Button
                type="submit"
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          )}

          {/* Toggle login/register */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              className="text-green-600 font-semibold hover:underline"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Sign up" : "Login"}
            </button>
          </div>

          {/* Seller section */}
          {isLogin && (
            <div className="border-t mt-6 pt-5">
              <div className="flex items-center gap-2 mb-3">
                <Store className="h-5 w-5 text-green-600" />
                <span className="text-sm font-semibold">Are you a seller?</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Sellers can log in with the username and password provided during vendor registration.
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    loginForm.setValue("username", "");
                    loginForm.setValue("password", "");
                    loginForm.setFocus("username");
                  }}
                >
                  <Store className="h-4 w-4 mr-2" />
                  Seller Login
                </Button>
                <Link href="/vendors">
                  <Button type="button" variant="outline" className="flex-1">
                    Become a Seller
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Branding & Features ── */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-yellow-300 via-yellow-400 to-green-400 flex-col justify-center items-center p-12 relative overflow-hidden">
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold mb-10 text-gray-900">Your Super App for Everything</h1>

          <div className="space-y-6">
            {[
              { icon: ShoppingBag, title: "Shop Everything", desc: "Groceries, electronics, fashion and more" },
              { icon: Truck, title: "Fast Delivery", desc: "Same-day delivery available in your area" },
              { icon: Store, title: "Sell on City Bell", desc: "Start your store and reach thousands of customers" },
              { icon: Shield, title: "Secure Payments", desc: "Your transactions are always protected" },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <f.icon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-gray-900">{f.title}</h4>
                  <p className="text-sm text-gray-700">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PhonePinDialog
        open={showPhoneDialog}
        onOpenChange={setShowPhoneDialog}
        onSuccess={handleAuthSuccess}
        userType={userType}
        vehicleTypes={vehicleTypes}
      />
    </div>
  );
}
