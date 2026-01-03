import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { StreamingCredentials } from "@/components/StreamingCredentials";
import { ExternalStorage } from "@/components/ExternalStorage";
import { LiveStatusBanner } from "@/components/LiveStatusBanner";

const Prerecord = () => {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Prerecord</h1>
              <p className="text-muted-foreground">
                Access streaming credentials and manage prerecorded content
              </p>
            </div>
            
            <LiveStatusBanner />
            <StreamingCredentials />
            <ExternalStorage />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Prerecord;