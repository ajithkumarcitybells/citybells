import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MessageCircle, ArrowLeft, Send, Plus, ImagePlus, X } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useUpload } from "@/hooks/use-upload";
import type { SupportTicket, SupportTicketWithMessages } from "@shared/schema";

const statusColors: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

type ViewState = "list" | "create" | "detail";

export default function SupportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<ViewState>("list");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [ticketImage, setTicketImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      setTicketImage(response.objectPath);
      toast({ title: "Image uploaded successfully" });
    },
    onError: () => {
      toast({ title: "Failed to upload image", variant: "destructive" });
    },
  });

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<SupportTicket[]>({
    queryKey: ["/api/support/tickets"],
    enabled: !!user,
  });

  const { data: ticketDetail, isLoading: detailLoading } = useQuery<SupportTicketWithMessages>({
    queryKey: ["/api/support/tickets", selectedTicketId],
    enabled: !!selectedTicketId && view === "detail",
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: { subject: string; message: string; image?: string | null }) => {
      const res = await apiRequest("POST", "/api/support/tickets", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets"] });
      setSubject("");
      setMessage("");
      setTicketImage(null);
      setView("list");
      toast({ title: "Ticket created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create ticket", variant: "destructive" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { ticketId: string; message: string }) => {
      const res = await apiRequest("POST", `/api/support/tickets/${data.ticketId}/messages`, { message: data.message });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets", selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets"] });
      setReplyMessage("");
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const handleCreateTicket = () => {
    if (!subject.trim() || !message.trim()) return;
    createTicketMutation.mutate({ subject: subject.trim(), message: message.trim(), image: ticketImage });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be less than 5MB", variant: "destructive" });
      return;
    }
    await uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendReply = () => {
    if (!replyMessage.trim() || !selectedTicketId) return;
    sendMessageMutation.mutate({ ticketId: selectedTicketId, message: replyMessage.trim() });
  };

  const openTicket = (id: string) => {
    setSelectedTicketId(id);
    setView("detail");
  };

  if (view === "create") {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Header />
        <main className="px-4 py-4 max-w-lg mx-auto">
          <button
            onClick={() => setView("list")}
            className="flex items-center gap-2 text-gray-600 mb-4"
            data-testid="button-back-to-list"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Tickets</span>
          </button>

          <h2 className="text-xl font-bold text-gray-800 mb-4" data-testid="text-create-title">Raise a Complaint</h2>

          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of your issue"
                data-testid="input-ticket-subject"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue in detail..."
                rows={5}
                data-testid="input-ticket-message"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Attach Image (optional)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                data-testid="input-ticket-image-file"
              />
              {ticketImage ? (
                <div className="relative inline-block">
                  <img
                    src={ticketImage}
                    alt="Attached"
                    className="h-32 w-32 object-cover rounded-lg border border-gray-200"
                    data-testid="img-ticket-preview"
                  />
                  <button
                    onClick={() => setTicketImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    data-testid="button-remove-image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="gap-2"
                  data-testid="button-attach-image"
                >
                  <ImagePlus className="h-4 w-4" />
                  {isUploading ? "Uploading..." : "Add Image"}
                </Button>
              )}
            </div>
            <Button
              onClick={handleCreateTicket}
              disabled={createTicketMutation.isPending || isUploading || !subject.trim() || !message.trim()}
              className="w-full bg-primary text-white"
              data-testid="button-submit-ticket"
            >
              {createTicketMutation.isPending ? "Submitting..." : "Submit Ticket"}
            </Button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (view === "detail" && selectedTicketId) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Header />
        <main className="px-4 py-4 max-w-lg mx-auto">
          <button
            onClick={() => { setView("list"); setSelectedTicketId(null); }}
            className="flex items-center gap-2 text-gray-600 mb-4"
            data-testid="button-back-to-list"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Tickets</span>
          </button>

          {detailLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : ticketDetail ? (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-gray-800" data-testid="text-ticket-subject">{ticketDetail.subject}</h2>
                  <Badge className={`${statusColors[ticketDetail.status]} no-default-hover-elevate no-default-active-elevate`} data-testid="badge-ticket-status">
                    {statusLabels[ticketDetail.status] || ticketDetail.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1" data-testid="text-ticket-date">
                  Created {ticketDetail.createdAt ? new Date(ticketDetail.createdAt).toLocaleString() : ""}
                </p>
              </div>

              <div className="space-y-3">
                {ticketDetail.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isAdmin ? "justify-start" : "justify-end"}`}
                    data-testid={`message-${msg.id}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.isAdmin
                        ? "bg-gray-200 text-gray-800 rounded-bl-sm"
                        : "bg-primary text-white rounded-br-sm"
                    }`}>
                      <p className={`text-xs font-semibold mb-1 ${msg.isAdmin ? "text-gray-600" : "text-white/80"}`}>
                        {msg.isAdmin ? "Admin" : "You"}
                      </p>
                      <p className="text-sm" data-testid={`text-message-content-${msg.id}`}>{msg.message}</p>
                      {msg.image && (
                        <img
                          src={msg.image}
                          alt="Attached"
                          className="mt-2 max-w-full rounded-lg max-h-48 object-contain"
                          data-testid={`img-message-${msg.id}`}
                        />
                      )}
                      <p className={`text-xs mt-1 ${msg.isAdmin ? "text-gray-500" : "text-white/70"}`}>
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {ticketDetail.status !== "closed" && (
                <div className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-2">
                  <Input
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                    data-testid="input-reply-message"
                  />
                  <Button
                    size="icon"
                    onClick={handleSendReply}
                    disabled={sendMessageMutation.isPending || !replyMessage.trim()}
                    className="bg-primary text-white"
                    data-testid="button-send-reply"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">Ticket not found</div>
          )}
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />
      <main className="px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-gray-800" data-testid="text-page-title">Help & Support</h1>
          </div>
          <Button
            onClick={() => setView("create")}
            className="bg-primary text-white"
            data-testid="button-raise-complaint"
          >
            <Plus className="h-4 w-4 mr-1" />
            Raise Complaint
          </Button>
        </div>

        {ticketsLoading ? (
          <div className="text-center py-8 text-gray-500">Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-1" data-testid="text-empty-state">No tickets yet</h3>
            <p className="text-gray-400 text-sm">Raise a complaint if you need help</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => openTicket(ticket.id)}
                className="w-full bg-white rounded-xl p-4 shadow-sm text-left hover-elevate"
                data-testid={`ticket-item-${ticket.id}`}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-800 text-sm" data-testid={`text-ticket-subject-${ticket.id}`}>{ticket.subject}</h3>
                  <Badge className={`${statusColors[ticket.status]} no-default-hover-elevate no-default-active-elevate`} data-testid={`badge-status-${ticket.id}`}>
                    {statusLabels[ticket.status] || ticket.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1" data-testid={`text-ticket-date-${ticket.id}`}>
                  {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : ""}
                </p>
              </button>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
