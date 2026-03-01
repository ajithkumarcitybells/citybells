import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Redirect, Link } from "wouter";
import { Eye, EyeOff, User, Mail, Phone, Lock, ShoppingBag, Truck, Shield, Store, Smartphone, ChevronLeft, Loader2 } from "lucide-react";
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

type PhoneStep = "phone" | "pin-login" | "pin-setup" | "pin-register";

function PhonePinDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (user: any) => void;
}) {
  const [step, setStep] = useState<PhoneStep>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userName, setUserName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [newName, setNewName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const { toast } = useToast();

  const resetState = () => {
    setStep("phone");
    setPhoneNumber("");
    setUserName("");
    setPin("");
    setConfirmPin("");
    setNewName("");
    setCurrentPassword("");
    setShowCurrentPassword(false);
    setError("");
    setShowPin(false);
  };

  const handlePhoneSubmit = async () => {
    if (phoneNumber.length !== 10 || !/^\d{10}$/.test(phoneNumber)) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
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
      setError(err.message || "Something went wrong");
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
      const res = await apiRequest("POST", "/api/login-phone", { phone: phoneNumber, pin });
      const user = await res.json();
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
    if (!currentPassword) {
      setError("Please enter your current password");
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
      const res = await apiRequest("POST", "/api/set-pin", {
        phone: phoneNumber,
        pin,
        currentPassword,
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
      const res = await apiRequest("POST", "/api/register-phone", {
        phone: phoneNumber,
        pin,
        name: newName,
      });
      const user = await res.json();
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
                Login with Phone & PIN
              </DialogTitle>
              <DialogDescription>
                Enter your phone number to continue. New users will set a PIN.
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
                  "Continue"
                )}
              </Button>
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
                {userName ? `Hi ${userName}! ` : ""}Verify your password and set a quick login PIN.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground -ml-2"
                onClick={() => { setStep("phone"); setPin(""); setConfirmPin(""); setCurrentPassword(""); setError(""); }}
                data-testid="button-change-phone-setup"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                +91 {phoneNumber}  · Change
              </Button>

              <div>
                <label className="text-sm font-medium text-foreground">Current Password</label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="Enter your account password"
                    value={currentPassword}
                    onChange={(e) => { setCurrentPassword(e.target.value); setError(""); }}
                    className="pl-10 pr-10 h-12"
                    data-testid="input-current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-400"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

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
                disabled={!currentPassword || pin.length < 4 || confirmPin.length < 4 || isLoading}
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
                <ChevronLeft className="h-4 w-4 mr-1" />
                +91 {phoneNumber}  · Change
              </Button>

              <div>
                <label className="text-sm font-medium text-foreground">Your Name</label>
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

              <div className="flex flex-col items-center gap-2">
                <label className="text-sm font-medium text-foreground self-start">Set a Login PIN (4-6 digits)</label>
                <InputOTP
                  maxLength={6}
                  value={pin}
                  onChange={(val) => { setPin(val); setError(""); }}
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

              <Button
                className="w-full h-12"
                onClick={handlePinRegister}
                disabled={pin.length < 4 || confirmPin.length < 4 || !newName || isLoading}
                data-testid="button-pin-register"
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
  const [showPassword, setShowPassword] = useState(false);
  const [showPhoneDialog, setShowPhoneDialog] = useState(true);
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "" },
    mode: "onBlur",
  });

  if (user) {
    if (user.isVendor) {
      window.location.href = "/seller/dashboard";
      return null;
    }
    if (user.isAdmin) return <Redirect to="/admin" />;
    return <Redirect to="/" />;
  }

  const handleAuthSuccess = (u: any) => {
    if (u?.isVendor) {
      window.location.href = "/seller/dashboard";
    } else if (u?.isAdmin) {
      setLocation("/admin");
    } else {
      setLocation("/");
    }
  };

  const onLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data, {
      onSuccess: handleAuthSuccess,
    });
  };

  const onRegisterSubmit = (data: RegisterFormData) => {
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate({
      username: data.email,
      password: data.password,
      name: data.name,
      email: data.email,
      phone: data.phone,
    }, {
      onSuccess: handleAuthSuccess,
    });
  };

  const features = [
    { icon: ShoppingBag, title: "Shop Everything", desc: "Groceries, electronics, fashion and more" },
    { icon: Truck, title: "Fast Delivery", desc: "Same-day delivery available in your area" },
    { icon: Store, title: "Sell on City Bell", desc: "Start your store and reach thousands of customers" },
    { icon: Shield, title: "Secure Payments", desc: "Your transactions are always protected" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      <div className="flex-1 p-6 lg:p-12 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full">
          <div className="flex items-center gap-3 mb-8">
            <img src={cityBellLogo} alt="City Bell" className="h-12 w-auto" />
            <span className="text-2xl font-bold text-red-600">CITY BELL</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {isLogin ? "Welcome back!" : "Create an account"}
          </h1>
          <p className="text-gray-500 mb-6">
            {isLogin 
              ? "Login to access your cart, wishlist and orders" 
              : "Sign up to start shopping fresh groceries"
            }
          </p>

          {isLogin && (
            <Button
              variant="outline"
              className="w-full h-12 mb-6 border-primary/30 text-primary font-semibold gap-2"
              onClick={() => setShowPhoneDialog(true)}
              data-testid="button-phone-pin-login"
            >
              <Smartphone className="h-5 w-5" />
              Login with Phone & PIN
            </Button>
          )}

          {isLogin && (
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-50 px-3 text-gray-400">or login with email</span>
              </div>
            </div>
          )}

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
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input 
                            placeholder="Enter your email or username" 
                            className="pl-10"
                            {...field} 
                            data-testid="input-username"
                          />
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
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input 
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="pl-10 pr-10"
                            {...field}
                            data-testid="input-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-400"
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
                  className="w-full bg-primary text-white py-6"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? "Logging in..." : "Login"}
                </Button>
              </form>
            </Form>
          ) : (
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-3">
              <div>
                <label className="text-sm font-medium">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                  <Input 
                    placeholder="Enter your full name" 
                    className="pl-10 h-12"
                    {...registerForm.register("name")}
                    data-testid="input-name"
                  />
                </div>
                {registerForm.formState.errors.name && (
                  <p className="text-sm text-red-500 mt-1">{registerForm.formState.errors.name.message}</p>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                  <Input 
                    type="email"
                    placeholder="Enter your email address" 
                    className="pl-10 h-12"
                    {...registerForm.register("email")}
                    data-testid="input-email"
                  />
                </div>
                {registerForm.formState.errors.email && (
                  <p className="text-sm text-red-500 mt-1">{registerForm.formState.errors.email.message}</p>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                  <Input 
                    type="tel"
                    placeholder="Enter 10-digit phone number"
                    className="pl-10 h-12"
                    maxLength={10}
                    {...registerForm.register("phone")}
                    data-testid="input-phone"
                  />
                </div>
                {registerForm.formState.errors.phone && (
                  <p className="text-sm text-red-500 mt-1">{registerForm.formState.errors.phone.message}</p>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                  <Input 
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password (min 6 characters)"
                    className="pl-10 pr-10 h-12"
                    {...registerForm.register("password")}
                    data-testid="input-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-400"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {registerForm.formState.errors.password && (
                  <p className="text-sm text-red-500 mt-1">{registerForm.formState.errors.password.message}</p>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                  <Input 
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    className="pl-10 pr-10 h-12"
                    {...registerForm.register("confirmPassword")}
                    data-testid="input-confirm-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-400"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-500 mt-1">{registerForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-gray-50 px-3 text-gray-400">or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 border-primary/30 text-primary font-semibold gap-2"
                onClick={() => setShowPhoneDialog(true)}
                data-testid="button-phone-pin-register"
              >
                <Smartphone className="h-5 w-5" />
                Quick Sign Up with Phone & PIN
              </Button>
              
              <Button 
                type="submit" 
                className="w-full bg-primary text-white py-6 mt-2"
                disabled={registerMutation.isPending}
                data-testid="button-register"
              >
                {registerMutation.isPending ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-500">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <Button
                variant="link"
                className="text-primary font-semibold ml-1 p-0 h-auto"
                onClick={() => setIsLogin(!isLogin)}
                data-testid="button-toggle-auth"
              >
                {isLogin ? "Sign up" : "Login"}
              </Button>
            </p>
          </div>

          {isLogin && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Store className="h-5 w-5 text-orange-500" />
                <span className="text-sm font-semibold text-gray-700">Are you a seller?</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Sellers can log in with the username and password provided during vendor registration.
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50"
                  onClick={() => {
                    loginForm.setValue("username", "");
                    loginForm.setValue("password", "");
                    loginForm.setFocus("username");
                  }}
                  data-testid="button-seller-login"
                >
                  <Store className="h-4 w-4 mr-2" />
                  Seller Login
                </Button>
                <Link href="/vendors">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-primary text-primary hover:bg-green-50"
                    data-testid="button-become-seller"
                  >
                    Become a Seller
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-yellow-400 via-yellow-300 to-green-400 p-12 items-center justify-center">
        <div className="max-w-md">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">
            Your Super App for Everything
          </h2>
          <div className="space-y-6">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/80 rounded-xl flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.desc}</p>
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
      />
    </div>
  );
}
