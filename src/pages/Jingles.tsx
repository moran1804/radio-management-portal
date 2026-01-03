import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Jingles } from "@/components/Jingles";

const JinglesPage = () => {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Jingles</h1>
              <p className="text-muted-foreground">
                Browse and manage your jingles from external storage
              </p>
            </div>
            
            <Jingles />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default JinglesPage;