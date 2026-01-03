import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Folder, File, ArrowLeft, Download, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FileItem {
  name: string;
  size: number;
  modified: string;
  downloadUrl: string;
  streamUrl: string;
  isDirectory: boolean;
}

export const ShowRecordings = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState("");
  const [pathHistory, setPathHistory] = useState<string[]>([]);

  const fetchFiles = async (path: string = "") => {
    try {
      setLoading(true);
      console.log('Fetching show recordings for path:', path);
      
      const { data, error } = await supabase.functions.invoke('show-recordings-storage', {
        body: { path }
      });

      console.log('Show recordings response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data?.success) {
        console.log('Files received:', data.files);
        setFiles(data.files || []);
      } else {
        console.error('Function returned error:', data);
        throw new Error(data?.message || 'Failed to fetch files');
      }
    } catch (error: any) {
      console.error('Error fetching show recordings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch show recordings",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath]);

  const handleFolderClick = (folderName: string) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    setPathHistory([...pathHistory, currentPath]);
    setCurrentPath(newPath);
  };

  const handleBackClick = () => {
    if (pathHistory.length > 0) {
      const previousPath = pathHistory[pathHistory.length - 1];
      setPathHistory(pathHistory.slice(0, -1));
      setCurrentPath(previousPath);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDownload = (file: FileItem) => {
    window.open(file.downloadUrl, '_blank');
  };

  const handlePlay = (file: FileItem) => {
    // This will play the audio file in a new tab/player
    window.open(file.streamUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading show recordings...</p>
        </div>
      </div>
    );
  }

  return (
    <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            {pathHistory.length > 0 && (
              <Button onClick={handleBackClick} variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          {currentPath && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Current path:</span>
              <Badge variant="secondary">/{currentPath}</Badge>
            </div>
          )}
        </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No files found in this directory
          </div>
        ) : (
          <div className="grid gap-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  {file.isDirectory ? (
                    <Folder className="w-5 h-5 text-blue-500" />
                  ) : (
                    <File className="w-5 h-5 text-green-500" />
                  )}
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {!file.isDirectory && (
                        <span>{formatFileSize(file.size)}</span>
                      )}
                      <span>Modified: {file.modified}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {file.isDirectory ? (
                    <Button
                      onClick={() => handleFolderClick(file.name)}
                      variant="outline"
                      size="sm"
                    >
                      Open
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => handlePlay(file)}
                        variant="outline"
                        size="sm"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Play
                      </Button>
                      <Button
                        onClick={() => handleDownload(file)}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
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