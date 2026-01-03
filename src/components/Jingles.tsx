import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Folder, Download, Play, Clock, HardDrive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FileItem {
  name: string;
  size: number;
  modified: string;
  downloadUrl: string;
  streamUrl: string;
  isDirectory: boolean;
}

export const Jingles = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState("");
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);

  const fetchFiles = async (path: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('jingles-storage', {
        body: { path: path }
      });

      if (error) {
        console.error('Error fetching files:', error);
        setFiles([]);
      } else {
        setFiles(data?.files || []);
      }
    } catch (error) {
      console.error('Error:', error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles("");
  }, []);

  const handleFolderClick = (folderName: string) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    setNavigationHistory([...navigationHistory, currentPath]);
    setCurrentPath(newPath);
    fetchFiles(newPath);
  };

  const handleBackClick = () => {
    if (navigationHistory.length > 0) {
      const previousPath = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(navigationHistory.slice(0, -1));
      setCurrentPath(previousPath);
      fetchFiles(previousPath);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = (file: FileItem) => {
    window.open(file.downloadUrl, '_blank');
  };

  const handlePlay = (file: FileItem) => {
    window.open(file.streamUrl, '_blank'); 
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3">Loading jingles...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          {navigationHistory.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBackClick}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <div className="text-sm text-muted-foreground">
            Jingles{currentPath && ` / ${currentPath}`}
          </div>
        </div>

        {files.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No files found in this directory.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  {file.isDirectory ? (
                    <Folder className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  ) : (
                    <HardDrive className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {formatFileSize(file.size)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(file.modified).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {file.isDirectory ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleFolderClick(file.name)}
                    >
                      Open
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePlay(file)}
                        className="flex items-center gap-1"
                      >
                        <Play className="h-3 w-3" />
                        Play
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDownload(file)}
                        className="flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};