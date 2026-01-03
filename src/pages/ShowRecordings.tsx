import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ShowRecordings } from "@/components/ShowRecordings";

const ShowRecordingsPage = () => {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Show Recordings</h1>
              <p className="text-muted-foreground">
                Browse and manage your show recordings from external storage
              </p>
            </div>
            
            <ShowRecordings />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default ShowRecordingsPage;