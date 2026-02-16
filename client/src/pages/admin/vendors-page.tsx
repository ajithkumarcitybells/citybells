import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Store, ArrowLeft, CheckCircle, XCircle, Mail, Phone, MapPin, User, FileText, ExternalLink } from "lucide-react";
import { AdminLayout } from "./index";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { VendorApplication } from "@shared/schema";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const filterTabs = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export default function AdminVendorsPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const { data: applications = [], isLoading } = useQuery<VendorApplication[]>({
    queryKey: ["/api/admin/vendor-applications"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (data: { id: string; status: string; adminNote?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/vendor-applications/${data.id}`, {
        status: data.status,
        adminNote: data.adminNote,
      });
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vendor-applications"] });
      if (variables.status === "approved") {
        const app = applications.find((a) => a.id === variables.id);
        toast({
          title: `Vendor account created with username: ${app?.username || "unknown"}`,
        });
      } else {
        toast({ title: "Application rejected" });
      }
      setAdminNote("");
    },
    onError: () => {
      toast({ title: "Failed to update application", variant: "destructive" });
    },
  });

  const filteredApplications = filter === "all" ? applications : applications.filter((a) => a.status === filter);

  const filterCounts = filterTabs.map((tab) => ({
    ...tab,
    count: tab.key === "all" ? applications.length : applications.filter((a) => a.status === tab.key).length,
  }));

  const selectedApp = applications.find((a) => a.id === selectedId);

  if (selectedId && selectedApp) {
    return (
      <AdminLayout>
        <div className="p-4 lg:p-6 max-w-4xl">
          <button
            onClick={() => { setSelectedId(null); setAdminNote(""); }}
            className="flex items-center gap-2 text-gray-600 mb-4"
            data-testid="button-back-to-applications"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Applications</span>
          </button>

          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h2 className="text-lg font-bold text-gray-800" data-testid="text-business-name">
                    {selectedApp.businessName}
                  </h2>
                  <p className="text-sm text-gray-600" data-testid="text-owner-name">
                    {selectedApp.ownerName}
                  </p>
                  <p className="text-xs text-gray-400 mt-1" data-testid="text-submitted-date">
                    Submitted {selectedApp.createdAt ? new Date(selectedApp.createdAt).toLocaleString() : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`${statusColors[selectedApp.status]} no-default-hover-elevate no-default-active-elevate`} data-testid="badge-detail-status">
                    {statusLabels[selectedApp.status] || selectedApp.status}
                  </Badge>
                  <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate" data-testid="badge-detail-service-type">
                    {selectedApp.serviceType}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
              <h3 className="font-semibold text-gray-800">Application Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm text-gray-800" data-testid="text-detail-email">{selectedApp.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm text-gray-800" data-testid="text-detail-phone">{selectedApp.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Address</p>
                    <p className="text-sm text-gray-800" data-testid="text-detail-address">{selectedApp.address || "Not provided"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Requested Username</p>
                    <p className="text-sm text-gray-800" data-testid="text-detail-username">{selectedApp.username}</p>
                  </div>
                </div>
              </div>

              {selectedApp.description && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Description</p>
                    <p className="text-sm text-gray-800" data-testid="text-detail-description">{selectedApp.description}</p>
                  </div>
                </div>
              )}

              {selectedApp.certificates && selectedApp.certificates.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Certificates</p>
                  <div className="flex gap-2 flex-wrap">
                    {selectedApp.certificates.map((cert, idx) => {
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(cert);
                      return isImage ? (
                        <a
                          key={idx}
                          href={cert}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                          data-testid={`link-certificate-${idx}`}
                        >
                          <img
                            src={cert}
                            alt={`Certificate ${idx + 1}`}
                            className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                            data-testid={`img-certificate-${idx}`}
                          />
                        </a>
                      ) : (
                        <a
                          key={idx}
                          href={cert}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-primary"
                          data-testid={`link-certificate-${idx}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Certificate {idx + 1}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedApp.adminNote && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Admin Note</p>
                  <p className="text-sm text-gray-700" data-testid="text-detail-admin-note">{selectedApp.adminNote}</p>
                </div>
              )}
            </div>

            {selectedApp.status === "approved" && (
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <p className="text-sm text-green-800 font-medium" data-testid="text-approved-message">
                  Vendor account created with username: {selectedApp.username}
                </p>
              </div>
            )}

            {selectedApp.status === "pending" && (
              <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                <h3 className="font-semibold text-gray-800">Admin Actions</h3>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Add a note (optional)..."
                  className="resize-none"
                  data-testid="textarea-admin-note"
                />
                <div className="flex gap-3 flex-wrap">
                  <Button
                    onClick={() => updateStatusMutation.mutate({ id: selectedApp.id, status: "approved", adminNote: adminNote.trim() || undefined })}
                    disabled={updateStatusMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    data-testid="button-approve"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => updateStatusMutation.mutate({ id: selectedApp.id, status: "rejected", adminNote: adminNote.trim() || undefined })}
                    disabled={updateStatusMutation.isPending}
                    variant="destructive"
                    data-testid="button-reject"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 lg:p-6 max-w-4xl">
        <div className="flex items-center gap-2 mb-6">
          <Store className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-gray-800" data-testid="text-admin-vendors-title">Vendor Applications</h1>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {filterCounts.map((tab) => (
            <Button
              key={tab.key}
              variant={filter === tab.key ? "default" : "outline"}
              onClick={() => setFilter(tab.key)}
              data-testid={`button-filter-${tab.key}`}
            >
              {tab.label}
              <Badge variant="secondary" className="ml-2 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-count-${tab.key}`}>
                {tab.count}
              </Badge>
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading applications...</div>
        ) : filteredApplications.length === 0 ? (
          <div className="text-center py-16">
            <Store className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600" data-testid="text-empty-state">No applications found</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredApplications.map((app) => (
              <button
                key={app.id}
                onClick={() => setSelectedId(app.id)}
                className="w-full bg-white rounded-xl p-4 shadow-sm text-left hover-elevate"
                data-testid={`vendor-application-item-${app.id}`}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm" data-testid={`text-business-name-${app.id}`}>
                      {app.businessName}
                    </h3>
                    <p className="text-xs text-gray-500" data-testid={`text-owner-name-${app.id}`}>
                      {app.ownerName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate" data-testid={`badge-service-type-${app.id}`}>
                      {app.serviceType}
                    </Badge>
                    <Badge className={`${statusColors[app.status]} no-default-hover-elevate no-default-active-elevate`} data-testid={`badge-status-${app.id}`}>
                      {statusLabels[app.status] || app.status}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2" data-testid={`text-date-${app.id}`}>
                  {app.createdAt ? new Date(app.createdAt).toLocaleString() : ""}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}