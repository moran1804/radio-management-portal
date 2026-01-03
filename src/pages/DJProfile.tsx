import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DJCredentials } from "@/components/DJCredentials";

const DJProfile = () => {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">DJ Profile & Credentials</h1>
            <DJCredentials />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DJProfile;