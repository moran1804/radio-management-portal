import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Plus, Trash2, Play, Pause } from "lucide-react";

interface RecurringSlot {
  id: string;
  dj_id: string;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  title: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  dj?: {
    display_name: string;
  };
}

interface DJ {
  id: string;
  display_name: string;
}

const formSchema = z.object({
  dj_id: z.string({ required_error: "Please select a DJ" }),
  day_of_week: z.string({ required_error: "Please select a day" }),
  start_time: z.string({ required_error: "Please enter a start time" }),
  duration_minutes: z.number().min(15, 'Duration must be at least 15 minutes'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
});

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const RecurringSlots = () => {
  const [slots, setSlots] = useState<RecurringSlot[]>([]);
  const [djs, setDJs] = useState<DJ[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dj_id: "",
      day_of_week: "",
      start_time: "",
      duration_minutes: 60,
      title: "",
      description: "",
    },
  });

  const fetchSlots = async () => {
    try {
      const { data, error } = await supabase
        .from('recurring_slots')
        .select(`
          *,
          dj:djs(display_name)
        `)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setSlots(data || []);
    } catch (error) {
      console.error('Error fetching recurring slots:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch recurring slots",
      });
    }
  };

  const fetchDJs = async () => {
    try {
      const { data, error } = await supabase
        .from('djs')
        .select('id, display_name')
        .order('display_name');

      if (error) throw error;
      setDJs(data || []);
    } catch (error) {
      console.error('Error fetching DJs:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSlots(), fetchDJs()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const slotData = {
        dj_id: values.dj_id,
        day_of_week: parseInt(values.day_of_week),
        start_time: values.start_time,
        duration_minutes: values.duration_minutes,
        title: values.title,
        description: values.description || null,
        created_by: user?.id,
      };

      // Create new recurring slot
      console.log('🔄 Creating new recurring slot...');
      const { error } = await supabase
        .from('recurring_slots')
        .insert(slotData);

      if (error) throw error;
      
      // Generate shows for the new slot
      console.log('🔄 Generating shows for new slot...');
      const { data: generateData, error: generateError } = await supabase.functions.invoke('generate-recurring-shows', {
        body: { weeks_ahead: 3 }
      });

      if (generateError) {
        console.error('❌ Failed to generate shows:', generateError);
        throw generateError;
      }
      
      toast({ 
        title: "Recurring slot created successfully",
        description: `Generated ${generateData.generated_count} shows for the new slot`
      });

      setDialogOpen(false);
      form.reset();
      fetchSlots();
    } catch (error: any) {
      console.error('Error creating recurring slot:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create recurring slot",
      });
    }
  };

  const toggleSlotStatus = async (slot: RecurringSlot) => {
    try {
      const { error } = await supabase
        .from('recurring_slots')
        .update({ is_active: !slot.is_active })
        .eq('id', slot.id);

      if (error) throw error;
      
      toast({ 
        title: `Slot ${!slot.is_active ? 'activated' : 'deactivated'}`,
        description: `The recurring slot is now ${!slot.is_active ? 'active' : 'inactive'}`
      });
      
      fetchSlots();
    } catch (error: any) {
      console.error('Error toggling slot status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update slot status",
      });
    }
  };

  const deleteSlot = async (slotId: string) => {
    try {
      // Delete all related shows first (cascading delete)
      const { error: showsError } = await supabase
        .from('shows')
        .delete()
        .eq('recurring_slot_id', slotId);

      if (showsError) throw showsError;

      // Then delete the recurring slot
      const { error } = await supabase
        .from('recurring_slots')
        .delete()
        .eq('id', slotId);

      if (error) throw error;
      
      toast({ title: "Recurring slot and related shows deleted" });
      fetchSlots();
    } catch (error: any) {
      console.error('Error deleting recurring slot:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete recurring slot",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading recurring slots...</div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recurring DJ Slots</CardTitle>
            <CardDescription>
              Manage weekly recurring time slots for DJs. To modify a slot, delete it and create a new one.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  form.reset();
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Slot
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create Recurring Slot</DialogTitle>
                  <DialogDescription>
                    Set up a weekly recurring time slot for a DJ
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="dj_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>DJ</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a DJ" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {djs.map((dj) => (
                                <SelectItem key={dj.id} value={dj.id}>
                                  {dj.display_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="day_of_week"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Day of Week</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a day" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {dayNames.map((day, index) => (
                                <SelectItem key={index} value={index.toString()}>
                                  {day}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="start_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time (UK Time 24hr)</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="duration_minutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (minutes)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="15"
                              max="480"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Show Title</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full">
                      Create Slot
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {slots.map((slot) => (
            <div key={slot.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">{slot.title}</h3>
                  <Badge variant={slot.is_active ? "default" : "secondary"}>
                    {slot.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {slot.dj?.display_name} • {dayNames[slot.day_of_week]}s at {slot.start_time} UK • {slot.duration_minutes}min
                </p>
                {slot.description && (
                  <p className="text-sm text-muted-foreground mt-1">{slot.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleSlotStatus(slot)}
                >
                  {slot.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteSlot(slot.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {slots.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No recurring slots configured yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};