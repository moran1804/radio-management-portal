import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { UnifiedShowsCard } from "@/components/UnifiedShowsCard";

const Schedule = () => {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-6">
          <UnifiedShowsCard />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Schedule;