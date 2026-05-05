import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarDays, Plus, UtensilsCrossed } from "lucide-react";
import { AdminLayout } from "./index";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AdminMealPlanForm, MealCalendarManager, formatRupees } from "@/components/food/meal-subscription-components";
import type { FoodMealPlan } from "@shared/schema";

const blankPlan = {
  name: "",
  description: "",
  image: "",
  cuisine: "",
  mealType: "lunch",
  dietType: "veg",
  calories: 600,
  pricePerDay: 199,
  pricePerWeek: 1199,
  pricePerMonth: 4499,
  duration: "weekly",
  includedMeals: [],
  dietaryTags: [],
  isActive: true,
};

export default function AdminFoodMealPlansPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FoodMealPlan | null>(null);
  const [form, setForm] = useState<any>(blankPlan);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarPlan, setCalendarPlan] = useState<FoodMealPlan | null>(null);
  const [entries, setEntries] = useState<any[]>([]);

  const { data: plans = [], isLoading } = useQuery<FoodMealPlan[]>({ queryKey: ["/api/admin/food/meal-plans"] });

  const savePlan = useMutation({
    mutationFn: async () => {
      const url = editing ? `/api/admin/food/meal-plans/${editing.id}` : "/api/admin/food/meal-plans";
      const res = await apiRequest(editing ? "PATCH" : "POST", url, form);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/food/meal-plans"] });
      setOpen(false);
      setEditing(null);
      setForm(blankPlan);
      toast({ title: "Meal plan saved", description: "The plan is ready for customers." });
    },
    onError: (err: any) => toast({ title: "Save failed", description: err?.message || "Could not save meal plan.", variant: "destructive" }),
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/food/meal-plans/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/food/meal-plans"] }),
  });

  const saveCalendar = useMutation({
    mutationFn: async () => {
      if (!calendarPlan) throw new Error("Select a plan first");
      const res = await apiRequest("POST", `/api/admin/food/meal-plans/${calendarPlan.id}/calendar`, { entries });
      return res.json();
    },
    onSuccess: () => {
      setCalendarOpen(false);
      setEntries([]);
      toast({ title: "Calendar saved", description: "Menu dates were updated." });
    },
    onError: (err: any) => toast({ title: "Calendar failed", description: err?.message || "Could not save calendar.", variant: "destructive" }),
  });

  const startEdit = (plan: FoodMealPlan) => {
    setEditing(plan);
    setForm(plan);
    setOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <UtensilsCrossed className="h-6 w-6 text-orange-500" />
            <div>
              <h1 className="text-2xl font-bold">Food Meal Plans</h1>
              <p className="text-sm text-gray-500">Create recurring meal plans and manage plan menu calendars.</p>
            </div>
          </div>
          <Button onClick={() => { setEditing(null); setForm(blankPlan); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Create plan</Button>
        </div>

        {isLoading ? <Skeleton className="h-80 rounded-xl" /> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {plans.map((plan) => (
              <Card key={plan.id} className="rounded-xl p-4">
                <div className="flex gap-4">
                  <img src={plan.image || "https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=600&q=80"} alt={plan.name} className="h-24 w-28 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{plan.name}</h3>
                      <Badge variant={plan.isActive ? "secondary" : "outline"}>{plan.isActive ? "Active" : "Inactive"}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">{plan.cuisine} • {plan.mealType.replace("_", " ")} • {plan.dietType.replace("_", " ")}</p>
                    <p className="mt-1 text-sm font-semibold">{formatRupees(plan.pricePerDay)}/day • {formatRupees(plan.pricePerWeek)}/week • {formatRupees(plan.pricePerMonth)}/month</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(plan)}>Edit</Button>
                      <Button size="sm" variant="outline" onClick={() => { setCalendarPlan(plan); setEntries([{ date: new Date().toISOString().slice(0, 10), breakfast: "", lunch: "", dinner: "", notes: "" }]); setCalendarOpen(true); }}><CalendarDays className="mr-1 h-4 w-4" />Calendar</Button>
                      <Button size="sm" variant="destructive" onClick={() => deletePlan.mutate(plan.id)}>Deactivate</Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit meal plan" : "Create meal plan"}</DialogTitle></DialogHeader>
          <AdminMealPlanForm value={form} onChange={setForm} />
          <Button onClick={() => savePlan.mutate()} disabled={savePlan.isPending}>{savePlan.isPending ? "Saving..." : "Save meal plan"}</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle>Meal calendar: {calendarPlan?.name}</DialogTitle></DialogHeader>
          <MealCalendarManager entries={entries} onEntriesChange={setEntries} />
          <Button onClick={() => saveCalendar.mutate()} disabled={saveCalendar.isPending}>Save calendar</Button>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
