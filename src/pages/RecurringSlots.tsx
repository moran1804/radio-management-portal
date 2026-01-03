import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { RecurringSlots } from "@/components/RecurringSlots";

const RecurringSlotsPage = () => {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Recurring DJ Slots</h1>
            <RecurringSlots />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default RecurringSlotsPage;