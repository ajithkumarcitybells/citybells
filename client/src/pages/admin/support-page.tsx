import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MessageCircle, ArrowLeft, Send } from "lucide-react";
import { AdminLayout } from "./index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

type TicketWithUser = SupportTicket & { username?: string; userName?: string };

const filterTabs = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
  { key: "closed", label: "Closed" },
];

export default function AdminSupportPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState("all");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<TicketWithUser[]>({
    queryKey: ["/api/admin/support/tickets"],
  });

  const { data: ticketDetail, isLoading: detailLoading } = useQuery<SupportTicketWithMessages>({
    queryKey: ["/api/support/tickets", selectedTicketId],
    enabled: !!selectedTicketId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { ticketId: string; message: string }) => {
      const res = await apiRequest("POST", `/api/support/tickets/${data.ticketId}/messages`, { message: data.message });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets", selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/tickets"] });
      setReplyMessage("");
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (data: { ticketId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/support/tickets/${data.ticketId}/status`, { status: data.status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets", selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/tickets"] });
      toast({ title: "Status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const handleSendReply = () => {
    if (!replyMessage.trim() || !selectedTicketId) return;
    sendMessageMutation.mutate({ ticketId: selectedTicketId, message: replyMessage.trim() });
  };

  const filteredTickets = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  const filterCounts = filterTabs.map((tab) => ({
    ...tab,
    count: tab.key === "all" ? tickets.length : tickets.filter((t) => t.status === tab.key).length,
  }));

  if (selectedTicketId) {
    return (
      <AdminLayout>
        <div className="p-4 lg:p-6 max-w-4xl">
          <button
            onClick={() => setSelectedTicketId(null)}
            className="flex items-center gap-2 text-gray-600 mb-4"
            data-testid="button-back-to-tickets"
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
                  <div>
                    <h2 className="text-lg font-bold text-gray-800" data-testid="text-ticket-subject">{ticketDetail.subject}</h2>
                    <p className="text-sm text-gray-500" data-testid="text-ticket-user">
                      By: {ticketDetail.userName || ticketDetail.username || "Unknown"}
                    </p>
                    <p className="text-xs text-gray-400" data-testid="text-ticket-date">
                      Created {ticketDetail.createdAt ? new Date(ticketDetail.createdAt).toLocaleString() : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={ticketDetail.status}
                      onValueChange={(value) => updateStatusMutation.mutate({ ticketId: selectedTicketId, status: value })}
                    >
                      <SelectTrigger className="w-[140px]" data-testid="select-ticket-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {ticketDetail.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isAdmin ? "justify-end" : "justify-start"}`}
                    data-testid={`message-${msg.id}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.isAdmin
                        ? "bg-primary text-white rounded-br-sm"
                        : "bg-gray-200 text-gray-800 rounded-bl-sm"
                    }`}>
                      <p className={`text-xs font-semibold mb-1 ${msg.isAdmin ? "text-white/80" : "text-gray-600"}`}>
                        {msg.isAdmin ? "You (Admin)" : ticketDetail.userName || ticketDetail.username || "User"}
                      </p>
                      <p className="text-sm" data-testid={`text-message-content-${msg.id}`}>{msg.message}</p>
                      <p className={`text-xs mt-1 ${msg.isAdmin ? "text-white/70" : "text-gray-500"}`}>
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-2">
                <Input
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type a reply..."
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                  data-testid="input-admin-reply"
                />
                <Button
                  size="icon"
                  onClick={handleSendReply}
                  disabled={sendMessageMutation.isPending || !replyMessage.trim()}
                  className="bg-primary text-white"
                  data-testid="button-send-admin-reply"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">Ticket not found</div>
          )}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 lg:p-6 max-w-4xl">
        <div className="flex items-center gap-2 mb-6">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-gray-800" data-testid="text-admin-support-title">Support Tickets</h1>
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

        {ticketsLoading ? (
          <div className="text-center py-8 text-gray-500">Loading tickets...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600" data-testid="text-empty-state">No tickets found</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicketId(ticket.id)}
                className="w-full bg-white rounded-xl p-4 shadow-sm text-left hover-elevate"
                data-testid={`admin-ticket-item-${ticket.id}`}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm" data-testid={`text-ticket-subject-${ticket.id}`}>{ticket.subject}</h3>
                    <p className="text-xs text-gray-500" data-testid={`text-ticket-user-${ticket.id}`}>
                      {ticket.userName || ticket.username || "Unknown User"}
                    </p>
                  </div>
                  <Badge className={`${statusColors[ticket.status]} no-default-hover-elevate no-default-active-elevate`} data-testid={`badge-status-${ticket.id}`}>
                    {statusLabels[ticket.status] || ticket.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 mt-2" data-testid={`text-ticket-date-${ticket.id}`}>
                  {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : ""}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
