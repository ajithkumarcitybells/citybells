import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  FileText,
  MapPin,
  Lock,
  UserCircle,
  Upload,
  X,
  Store,
  Eye,
  EyeOff,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertVendorApplicationSchema } from "@shared/schema";
import cityBellLogo from "@assets/citybells-logo_1769903304782.png";

const formSchema = insertVendorApplicationSchema.extend({
  businessName: z.string().min(2, "Business name is required"),
  ownerName: z.string().min(2, "Owner name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  serviceType: z.string().min(1, "Please select a service type"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  description: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  certificates: z.array(z.string()).min(1, "Please upload at least one certificate"),
});

type FormData = z.infer<typeof formSchema>;

export default function VendorApplicationPage() {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [certificateUrls, setCertificateUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessName: "",
      ownerName: "",
      email: "",
      phone: "",
      serviceType: "",
      description: "",
      address: "",
      username: "",
      password: "",
      certificates: [],
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("POST", "/api/vendor-applications", {
        ...data,
        certificates: certificateUrls,
      });
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Application submitted successfully!",
        description:
          "You will be notified once your application is reviewed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const response = await fetch("/api/uploads/direct", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileData: base64,
            contentType: file.type,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to upload file");
        }

        const result = await response.json();
        setCertificateUrls((prev) => {
          const updated = [...prev, result.objectPath];
          form.setValue("certificates", updated, { shouldValidate: true });
          return updated;
        });
      }
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
    e.target.value = "";
  };

  const removeCertificate = (index: number) => {
    setCertificateUrls((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      form.setValue("certificates", updated, { shouldValidate: true });
      return updated;
    });
  };

  const onSubmit = (data: FormData) => {
    submitMutation.mutate(data);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2
              className="text-xl font-bold text-gray-800"
              data-testid="text-success-title"
            >
              Application Submitted
            </h2>
            <p
              className="text-gray-500 text-sm"
              data-testid="text-success-message"
            >
              Application submitted successfully! You will be notified once your
              application is reviewed.
            </p>
            <Link href="/">
              <Button className="w-full mt-4" data-testid="link-back-home-success">
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4 pb-8">
        <div className="flex items-center gap-3 py-4">
          <Link href="/">
            <button
              className="flex items-center gap-1 text-gray-600 text-sm"
              data-testid="link-back-home"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Home</span>
            </button>
          </Link>
        </div>

        <div className="flex flex-col items-center mb-6">
          <img
            src={cityBellLogo}
            alt="City Bell"
            className="h-14 w-auto mb-2"
            data-testid="img-logo"
          />
          <h1
            className="text-xl font-bold text-gray-800"
            data-testid="text-page-title"
          >
            Become a Vendor
          </h1>
          <p className="text-gray-500 text-sm text-center mt-1">
            Apply to sell your products on City Bell
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Store className="h-5 w-5" />
              Vendor Application
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
                data-testid="form-vendor-application"
              >
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Enter your business name"
                            className="pl-10"
                            {...field}
                            data-testid="input-business-name"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ownerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Enter owner's full name"
                            className="pl-10"
                            {...field}
                            data-testid="input-owner-name"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              type="email"
                              placeholder="email@example.com"
                              className="pl-10"
                              {...field}
                              data-testid="input-email"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Enter phone number"
                              className="pl-10"
                              {...field}
                              data-testid="input-phone"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="serviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-service-type">
                            <SelectValue placeholder="Select service type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="E-commerce">E-commerce</SelectItem>
                          <SelectItem value="Food">Food</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Business Description{" "}
                        <span className="text-gray-400 font-normal">
                          (optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your business..."
                          rows={3}
                          {...field}
                          data-testid="textarea-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Business Address{" "}
                        <span className="text-gray-400 font-normal">
                          (optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Textarea
                            placeholder="Enter business address"
                            className="pl-10"
                            rows={2}
                            {...field}
                            data-testid="textarea-address"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    Login Credentials
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    These credentials will be used for vendor login after
                    approval.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Choose Username</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                placeholder="Choose a username"
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
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Choose Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Min 6 characters"
                                className="pl-10 pr-10"
                                {...field}
                                data-testid="input-password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                data-testid="button-toggle-password"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <FormLabel className="flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4" />
                    Business Certificates{" "}
                    <span className="text-red-500 font-normal">*</span>
                  </FormLabel>

                  <div className="space-y-2">
                    {certificateUrls.map((url, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-gray-100 rounded-md p-2 text-sm"
                        data-testid={`certificate-item-${index}`}
                      >
                        <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="truncate flex-1 text-gray-700">
                          {url.split("/").pop() || url}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeCertificate(index)}
                          className="text-gray-400"
                          data-testid={`button-remove-certificate-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    <label
                      className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-md p-4 cursor-pointer text-sm text-gray-500"
                      data-testid="label-upload-certificates"
                    >
                      <Upload className="h-4 w-4" />
                      {isUploading
                        ? "Uploading..."
                        : "Click to upload certificates"}
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        data-testid="input-certificates"
                      />
                    </label>
                    {form.formState.errors.certificates && (
                      <p className="text-sm text-red-500 mt-1" data-testid="error-certificates">
                        {form.formState.errors.certificates.message}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-6"
                  disabled={submitMutation.isPending || isUploading}
                  data-testid="button-submit-application"
                >
                  {submitMutation.isPending
                    ? "Submitting..."
                    : "Submit Application"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
