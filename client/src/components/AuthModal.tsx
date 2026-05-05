import React, { useState } from "react";
import { X, Mail, Phone, Lock, Eye, EyeOff, Smartphone, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DriverSignupForm } from "./DriverSignupForm";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: any, token: string) => void;
  initialTab?: AuthTab;
}

type AuthTab = "user-login" | "user-signup" | "driver-login" | "driver-signup";
type LoginMethod = "email" | "phone" | "otp" | "google";

export function AuthModal({ isOpen, onClose, onAuthSuccess, initialTab = "user-login" }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("email");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // User Login State
  const [userLoginForm, setUserLoginForm] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  // Driver Login State
  const [driverLoginForm, setDriverLoginForm] = useState({
    email: "",
    phone: "",
    password: "",
    rememberMe: false,
  });

  // OTP State
  const [otpState, setOtpState] = useState({
    phone: "",
    otp: "",
    step: "phone", // phone or verify
  });

  if (!isOpen) return null;

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userLoginForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      localStorage.setItem("token", data.token);
      if (userLoginForm.rememberMe) {
        localStorage.setItem("rememberMe", "true");
      }

      toast({ title: "Login successful!", description: "Redirecting..." });
      onAuthSuccess(data.user, data.token);
      onClose();
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDriverLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        username: driverLoginForm.email || driverLoginForm.phone,
        password: driverLoginForm.password,
      };

      const response = await fetch("/api/driver/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Login failed");
      }

      const driver = data.driver || data.user || data;
      const token = data.token || "";

      if (token) {
        localStorage.setItem("driverToken", token);
      } else {
        localStorage.removeItem("driverToken");
      }
      if (driver?.id) {
        localStorage.setItem("driverId", driver.id);
      }
      if (driverLoginForm.rememberMe) {
        localStorage.setItem("rememberDriver", "true");
      }

      toast({ title: "Driver login successful!", description: "Redirecting..." });
      onAuthSuccess(driver, token);
    } catch (error: any) {
      toast({
        title: "Driver login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOTP = async () => {
    if (!otpState.phone) {
      toast({
        title: "Error",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/driver/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: otpState.phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }

      toast({
        title: "OTP sent!",
        description: `Check your SMS for the OTP${process.env.NODE_ENV === "development" ? ` (Dev: ${data.otp})` : ""}`,
      });

      setOtpState({ ...otpState, step: "verify" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpState.otp) {
      toast({
        title: "Error",
        description: "Please enter the OTP",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/driver/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: otpState.phone,
          otp: otpState.otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "OTP verification failed");
      }

      localStorage.setItem("driverToken", data.token);

      toast({ title: "OTP verified!", description: "Redirecting..." });
      onAuthSuccess(data.driver, data.token);
      onClose();
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative w-full max-w-md max-h-screen overflow-y-auto">
        {/* Glassmorphism card */}
        <div className="bg-white/10 backdrop-blur-3xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 p-2 hover:bg-white/20 rounded-full transition"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Header with Logo */}
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 pt-8 pb-6">
            <h1 className="text-3xl font-bold text-white mb-2">CityServe</h1>
            <p className="text-white/80 text-sm">Get rides, earn money</p>
          </div>

          {/* Tab Navigation */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex gap-2 bg-white/10 rounded-full p-1 border border-white/10">
              <button
                onClick={() => {
                  setActiveTab("user-login");
                  setLoginMethod("email");
                }}
                className={`flex-1 py-2 px-3 rounded-full font-medium text-sm transition ${
                  activeTab === "user-login"
                    ? "bg-white text-orange-600 shadow-lg"
                    : "text-white/70 hover:text-white"
                }`}
              >
                Rider
              </button>
              <button
                onClick={() => {
                  setActiveTab("driver-login");
                  setLoginMethod("email");
                }}
                className={`flex-1 py-2 px-3 rounded-full font-medium text-sm transition ${
                  activeTab === "driver-login" || activeTab === "driver-signup"
                    ? "bg-white text-orange-600 shadow-lg"
                    : "text-white/70 hover:text-white"
                }`}
              >
                Driver
              </button>
              <button
                onClick={() => setActiveTab("user-signup")}
                className={`flex-1 py-2 px-3 rounded-full font-medium text-sm transition ${
                  activeTab === "user-signup"
                    ? "bg-white text-orange-600 shadow-lg"
                    : "text-white/70 hover:text-white"
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            {/* USER LOGIN */}
            {activeTab === "user-login" && (
              <form onSubmit={handleUserLogin} className="space-y-4">
                <div>
                  <label className="text-sm text-white/70 block mb-2">
                    Email Address
                  </label>
                  <div className="flex items-center bg-white/10 border border-white/20 rounded-xl px-4">
                    <Mail className="w-4 h-4 text-white/50" />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={userLoginForm.email}
                      onChange={(e) =>
                        setUserLoginForm({
                          ...userLoginForm,
                          email: e.target.value,
                        })
                      }
                      className="flex-1 bg-transparent text-white placeholder-white/40 py-3 px-3 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-white/70 block mb-2">
                    Password
                  </label>
                  <div className="flex items-center bg-white/10 border border-white/20 rounded-xl px-4">
                    <Lock className="w-4 h-4 text-white/50" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={userLoginForm.password}
                      onChange={(e) =>
                        setUserLoginForm({
                          ...userLoginForm,
                          password: e.target.value,
                        })
                      }
                      className="flex-1 bg-transparent text-white placeholder-white/40 py-3 px-3 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-white/50 hover:text-white/80"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-white/70">
                    <input
                      type="checkbox"
                      checked={userLoginForm.rememberMe}
                      onChange={(e) =>
                        setUserLoginForm({
                          ...userLoginForm,
                          rememberMe: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded"
                    />
                    Remember me
                  </label>
                  <a
                    href="#"
                    className="text-sm text-white/70 hover:text-white"
                  >
                    Forgot password?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold py-3 rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Login
                </button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white/5 text-white/50">Or</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full border border-white/20 text-white font-medium py-2 rounded-xl hover:bg-white/10 transition flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>
              </form>
            )}

            {/* DRIVER LOGIN */}
            {activeTab === "driver-login" && (
              <div className="space-y-4">
                {/* Login Method Selector */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setLoginMethod("email")}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                      loginMethod === "email"
                        ? "bg-white text-orange-600"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    }`}
                  >
                    Email
                  </button>
                  <button
                    onClick={() => setLoginMethod("otp")}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                      loginMethod === "otp"
                        ? "bg-white text-orange-600"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    }`}
                  >
                    OTP
                  </button>
                </div>

                {loginMethod === "email" && (
                  <form onSubmit={handleDriverLogin} className="space-y-4">
                    <div>
                      <label className="text-sm text-white/70 block mb-2">
                        Email or Phone
                      </label>
                      <div className="flex items-center bg-white/10 border border-white/20 rounded-xl px-4">
                        <Mail className="w-4 h-4 text-white/50" />
                        <input
                          type="text"
                          placeholder="email@example.com or 98765XXXXX"
                          value={driverLoginForm.email || driverLoginForm.phone}
                          onChange={(e) => {
                            if (e.target.value.includes("@")) {
                              setDriverLoginForm({
                                ...driverLoginForm,
                                email: e.target.value,
                                phone: "",
                              });
                            } else {
                              setDriverLoginForm({
                                ...driverLoginForm,
                                phone: e.target.value,
                                email: "",
                              });
                            }
                          }}
                          className="flex-1 bg-transparent text-white placeholder-white/40 py-3 px-3 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-white/70 block mb-2">
                        Password
                      </label>
                      <div className="flex items-center bg-white/10 border border-white/20 rounded-xl px-4">
                        <Lock className="w-4 h-4 text-white/50" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={driverLoginForm.password}
                          onChange={(e) =>
                            setDriverLoginForm({
                              ...driverLoginForm,
                              password: e.target.value,
                            })
                          }
                          className="flex-1 bg-transparent text-white placeholder-white/40 py-3 px-3 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-white/50 hover:text-white/80"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm text-white/70">
                        <input
                          type="checkbox"
                          checked={driverLoginForm.rememberMe}
                          onChange={(e) =>
                            setDriverLoginForm({
                              ...driverLoginForm,
                              rememberMe: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded"
                        />
                        Remember me
                      </label>
                      <a
                        href="#"
                        className="text-sm text-white/70 hover:text-white"
                      >
                        Forgot password?
                      </a>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold py-3 rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      Login as Driver
                    </button>
                  </form>
                )}

                {loginMethod === "otp" && (
                  <div className="space-y-4">
                    {otpState.step === "phone" ? (
                      <>
                        <div>
                          <label className="text-sm text-white/70 block mb-2">
                            Phone Number
                          </label>
                          <div className="flex items-center bg-white/10 border border-white/20 rounded-xl px-4">
                            <Smartphone className="w-4 h-4 text-white/50" />
                            <input
                              type="tel"
                              placeholder="98765XXXXX"
                              value={otpState.phone}
                              onChange={(e) =>
                                setOtpState({
                                  ...otpState,
                                  phone: e.target.value,
                                })
                              }
                              className="flex-1 bg-transparent text-white placeholder-white/40 py-3 px-3 outline-none"
                            />
                          </div>
                        </div>

                        <button
                          onClick={handleRequestOTP}
                          disabled={isLoading || !otpState.phone}
                          className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold py-3 rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isLoading && (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          )}
                          Send OTP
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-white/70 text-sm">
                          Enter the 6-digit OTP sent to {otpState.phone}
                        </p>

                        <div>
                          <label className="text-sm text-white/70 block mb-2">
                            OTP
                          </label>
                          <input
                            type="text"
                            placeholder="000000"
                            maxLength={6}
                            value={otpState.otp}
                            onChange={(e) =>
                              setOtpState({
                                ...otpState,
                                otp: e.target.value.replace(/\D/g, ""),
                              })
                            }
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none text-center text-2xl tracking-widest"
                          />
                        </div>

                        <button
                          onClick={handleVerifyOTP}
                          disabled={isLoading || otpState.otp.length !== 6}
                          className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold py-3 rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isLoading && (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          )}
                          Verify OTP
                        </button>

                        <button
                          onClick={() =>
                            setOtpState({ ...otpState, step: "phone", otp: "" })
                          }
                          className="w-full text-white/70 hover:text-white font-medium py-2"
                        >
                          Change Phone Number
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* DRIVER SIGNUP */}
            {activeTab === "driver-signup" && (
              <DriverSignupForm onSuccess={onAuthSuccess} />
            )}

            {/* SIGNUP PROMPT */}
            {(activeTab === "user-login" || activeTab === "driver-login") && (
              <p className="text-center text-white/70 text-sm mt-6">
                Don't have an account?{" "}
                <button
                  onClick={() => setActiveTab("user-signup")}
                  className="text-white font-semibold hover:underline"
                >
                  Sign up
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
