import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Redirect, Link } from "wouter";
import { Eye, EyeOff, User, Mail, Phone, Lock, ShoppingBag, Truck, Heart, Shield, Store } from "lucide-react";
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
import { useAuth } from "@/hooks/use-auth";
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

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
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

  const onLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data, {
      onSuccess: (u) => {
        if (u?.isVendor) {
          window.location.href = "/seller/dashboard";
        } else if (u?.isAdmin) {
          setLocation("/admin");
        } else {
          setLocation("/");
        }
      },
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
      onSuccess: (u) => {
        if (u?.isVendor) {
          window.location.href = "/seller/dashboard";
        } else if (u?.isAdmin) {
          setLocation("/admin");
        } else {
          setLocation("/");
        }
      },
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
          <p className="text-gray-500 mb-8">
            {isLogin 
              ? "Login to access your cart, wishlist and orders" 
              : "Sign up to start shopping fresh groceries"
            }
          </p>

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
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
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
                  <input 
                    placeholder="Enter your full name" 
                    className="flex h-12 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                  <input 
                    type="email"
                    placeholder="Enter your email address" 
                    className="flex h-12 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                  <input 
                    type="tel"
                    placeholder="Enter 10-digit phone number"
                    className="flex h-12 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                  <input 
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password (min 6 characters)"
                    className="flex h-12 w-full rounded-md border border-input bg-background pl-10 pr-10 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    {...registerForm.register("password")}
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
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
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    className="flex h-12 w-full rounded-md border border-input bg-background pl-10 pr-10 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    {...registerForm.register("confirmPassword")}
                    data-testid="input-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-500 mt-1">{registerForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-primary text-white py-6 mt-4"
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
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary font-semibold ml-2"
                data-testid="button-toggle-auth"
              >
                {isLogin ? "Sign up" : "Login"}
              </button>
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
    </div>
  );
}
