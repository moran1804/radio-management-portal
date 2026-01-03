import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUnifiedShows } from "@/hooks/useUnifiedShows";
import { useAuth } from "@/hooks/useAuth";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Play, Square } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO } from "date-fns";
import { formatUKTimeRange } from "@/utils/timezone";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export default function Calendar() {
  const { user, loading: authLoading } = useAuth();
  const { shows, loading } = useUnifiedShows(true); // Show all shows for calendar view
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Start week on Monday
  );

  // Navigate weeks
  const goToPreviousWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));
  const goToThisWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Generate week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => addDays(currentWeekStart, index));
  }, [currentWeekStart]);

  // Group shows by day
  const showsByDay = useMemo(() => {
    const grouped: Record<string, typeof shows> = {};
    
    weekDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      grouped[dayKey] = shows.filter(show => {
        const showDate = parseISO(show.start_time);
        return isSameDay(showDate, day);
      }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    });
    
    return grouped;
  }, [shows, weekDays]);

  const getStatusBadge = (show: any) => {
    const now = new Date();
    const startTime = new Date(show.start_time);
    const endTime = new Date(show.end_time);
    const showStatus = show.schedule?.status || 'scheduled';
    
    if (showStatus === 'live' || show.job?.status === 'running') {
      return <Badge className="bg-red-500 text-white">LIVE</Badge>;
    }
    
    if (now >= startTime && now <= endTime && showStatus !== 'completed') {
      return <Badge className="bg-orange-500 text-white">ON AIR</Badge>;
    }
    
    if (showStatus === 'completed') {
      return <Badge variant="outline" className="text-green-600 border-green-600">COMPLETED</Badge>;
    }
    
    if (startTime > now) {
      return <Badge variant="outline" className="text-blue-600 border-blue-600">SCHEDULED</Badge>;
    }
    
    return <Badge variant="outline" className="text-gray-600 border-gray-600">PAST</Badge>;
  };

  const formatShowTime = (startTime: string, endTime: string) => {
    return formatUKTimeRange(startTime, endTime);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    window.location.href = '/auth';
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="p-6 max-w-full">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Schedule Calendar</h1>
            <p className="text-muted-foreground">View your weekly show schedule</p>
          </div>

          {/* Week Navigation */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousWeek}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous Week
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToThisWeek}
                    className="flex items-center gap-2"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    This Week
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextWeek}
                    className="flex items-center gap-2"
                  >
                    Next Week
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="text-lg font-semibold">
                  {format(weekDays[0], 'd MMM')} - {format(weekDays[6], 'd MMM yyyy')}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar Grid - Vertical Layout */}
          <div className="space-y-4">
            {weekDays.map((day, index) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayShows = showsByDay[dayKey] || [];
              const isToday = isSameDay(day, new Date());
              
              return (
                <Card key={dayKey} className={`${isToday ? 'ring-2 ring-primary' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Day Column */}
                      <div className="flex-shrink-0 w-24 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-muted-foreground">
                            {format(day, 'EEE')}
                          </span>
                          <span className={`text-2xl font-semibold ${isToday ? 'text-primary' : ''}`}>
                            {format(day, 'd')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(day, 'MMM')}
                          </span>
                        </div>
                      </div>
                      
                      {/* Shows Row */}
                      <div className="flex-1">
                        {dayShows.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <p className="text-sm">No shows scheduled</p>
                          </div>
                        ) : (
                          <div className="flex gap-3 overflow-x-auto pb-2">
                            {dayShows.map((show) => (
                              <div
                                key={show.id}
                                className="flex-shrink-0 w-64 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                              >
                                <div className="mb-2">
                                  <h4 className="text-sm font-medium truncate">
                                    {show.title}
                                  </h4>
                                  {show.dj_name && (
                                    <p className="text-xs text-muted-foreground">
                                      DJ: {show.dj_name}
                                    </p>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                  <Clock className="h-3 w-3" />
                                  {formatShowTime(show.start_time, show.end_time)}
                                </div>
                                
                                {show.description && (
                                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                    {show.description}
                                  </p>
                                )}
                                
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    {show.show_type === 'prerecorded' && (
                                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                        Pre-recorded
                                      </span>
                                    )}
                                    {show.show_type === 'live' && (
                                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                                        Live
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    {show.file_path && (
                                      <div className="flex items-center gap-1">
                                        <Play className="h-3 w-3 text-green-600" />
                                        <span className="text-green-600">Ready</span>
                                      </div>
                                    )}
                                    
                                    {show.job && (
                                      <div className="flex items-center gap-1">
                                        {show.job.status === 'running' ? (
                                          <>
                                            <Square className="h-3 w-3 text-red-500" />
                                            <span className="text-red-500">Running</span>
                                          </>
                                        ) : (
                                          <>
                                            <Clock className="h-3 w-3 text-blue-500" />
                                            <span className="text-blue-500">Scheduled</span>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading shows...</p>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}