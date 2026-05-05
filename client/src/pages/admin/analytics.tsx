import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Car, DollarSign, AlertCircle } from "lucide-react";

interface Analytics {
  summary: {
    totalRides: number;
    totalRevenue: number;
    avgRideValue: number;
    totalCommission: number;
    driverPayouts: number;
  };
  ridesByStatus: {
    completed: number;
    cancelled: number;
    pending: number;
  };
  drivers: {
    total: number;
    approved: number;
    active: number;
  };
  users: {
    total: number;
  };
  charts: {
    ridesByHour: Array<{ hour: number; count: number }>;
  };
}

const COLORS = ["#10b981", "#ef4444", "#f59e0b"];

export default function Analytics() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  // Fetch analytics
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const query = new URLSearchParams({
          startDate: dateRange.start,
          endDate: dateRange.end,
        });
        const res = await fetch(`/api/admin/analytics?${query}`);
        if (!res.ok) throw new Error("Failed to fetch analytics");
        const data: Analytics = await res.json();
        setAnalytics(data);
      } catch (err) {
        console.error("Error fetching analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchAnalytics();
  }, [user, dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Failed to load analytics</div>
      </div>
    );
  }

  const rideStatusData = [
    { name: "Completed", value: analytics.ridesByStatus.completed },
    { name: "Cancelled", value: analytics.ridesByStatus.cancelled },
    { name: "Pending", value: analytics.ridesByStatus.pending },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold mb-4">Analytics Dashboard</h1>

          {/* Date Range Picker */}
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {/* Total Revenue */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold">₹{analytics.summary.totalRevenue.toFixed(0)}</p>
              </div>
              <DollarSign className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </Card>

          {/* Total Rides */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Rides</p>
                <p className="text-3xl font-bold">{analytics.summary.totalRides}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </Card>

          {/* Avg Ride Value */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg Ride Value</p>
                <p className="text-3xl font-bold">₹{analytics.summary.avgRideValue.toFixed(0)}</p>
              </div>
              <AlertCircle className="w-12 h-12 text-orange-500 opacity-20" />
            </div>
          </Card>

          {/* Commission */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Commission</p>
                <p className="text-3xl font-bold">₹{analytics.summary.totalCommission.toFixed(0)}</p>
              </div>
              <DollarSign className="w-12 h-12 text-purple-500 opacity-20" />
            </div>
          </Card>

          {/* Driver Payouts */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Driver Payouts</p>
                <p className="text-3xl font-bold">₹{analytics.summary.driverPayouts.toFixed(0)}</p>
              </div>
              <Car className="w-12 h-12 text-indigo-500 opacity-20" />
            </div>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Rides by Hour */}
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4">Rides by Hour</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.charts.ridesByHour}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" label={{ value: "Hour", position: "insideBottomRight", offset: -5 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Rides by Status */}
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4">Rides by Status</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={rideStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Users */}
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Users
            </h2>
            <div className="text-4xl font-bold text-blue-600">{analytics.users.total}</div>
            <p className="text-sm text-gray-600 mt-2">Total registered users</p>
          </Card>

          {/* Drivers */}
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Car className="w-5 h-5" />
              Drivers
            </h2>
            <div>
              <div className="text-4xl font-bold text-green-600">{analytics.drivers.approved}</div>
              <p className="text-sm text-gray-600 mt-2">
                {analytics.drivers.approved} approved ({analytics.drivers.active} active)
              </p>
              <p className="text-sm text-gray-500 mt-1">Total: {analytics.drivers.total}</p>
            </div>
          </Card>

          {/* Platform Health */}
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4">Platform Health</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Completion Rate</span>
                <Badge variant="default" className="bg-green-600">
                  {analytics.ridesByStatus.completed > 0
                    ? Math.round(
                        (analytics.ridesByStatus.completed /
                          (analytics.ridesByStatus.completed +
                            analytics.ridesByStatus.cancelled)) *
                          100
                      )
                    : 0}
                  %
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Cancellation Rate</span>
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  {analytics.ridesByStatus.cancelled > 0
                    ? Math.round(
                        (analytics.ridesByStatus.cancelled /
                          (analytics.ridesByStatus.completed +
                            analytics.ridesByStatus.cancelled)) *
                          100
                      )
                    : 0}
                  %
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Profit Margin</span>
                <Badge variant="outline" className="text-purple-600 border-purple-600">
                  {analytics.summary.totalRevenue > 0
                    ? Math.round((analytics.summary.totalCommission / analytics.summary.totalRevenue) * 100)
                    : 0}
                  %
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
