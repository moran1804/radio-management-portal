import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play, Pause, Download, RefreshCw, Music, ExternalLink, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";

interface StorageFile {
  name: string;
  size: number;
  modified: string;
  downloadUrl: string;
  streamUrl: string;
}

export const ExternalStorage = () => {
  const { toast } = useToast();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const STORAGE_URL = "https://storage.chapmoran.co.uk/s/iWyHqQSKmayQHnR";

  useEffect(() => {
    fetchFiles();
    return () => {
      if (audio) {
        audio.pause();
        audio.src = "";
      }
    };
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      console.log('Calling Nextcloud WebDAV function...');
      
      // Call our Nextcloud WebDAV function 
      const { data, error } = await supabase.functions.invoke('sftp-storage');
      
      console.log('Nextcloud function response:', { data, error });
      
      if (error) {
        console.error('Nextcloud function error:', error);
        throw error;
      }

      if (data.success && data.files) {
        console.log('Files received from Nextcloud function:', data.files);
        
        // Sort files by modified date (newest first)
        const sortedFiles = data.files.sort((a, b) => {
          const dateA = new Date(a.modified);
          const dateB = new Date(b.modified);
          return dateB.getTime() - dateA.getTime();
        });
        
        setFiles(sortedFiles);
        
        toast({
          title: "Audio files loaded",
          description: `Found ${sortedFiles.length} audio files in Nextcloud storage`,
        });
      } else {
        console.error('No files in Nextcloud response or failed:', data);
        throw new Error(data.error || 'Failed to fetch files via Nextcloud');
      }
      
    } catch (error) {
      console.error('Error fetching files via Nextcloud:', error);
      toast({
        variant: "destructive",
        title: "Nextcloud Error",
        description: `Failed to load files via Nextcloud: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    // Handle relative time strings like "35 minutes ago"
    if (dateString.includes('ago') || dateString === 'Recently') {
      return dateString;
    }
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playAudio = async (file: StorageFile) => {
    if (currentlyPlaying === file.name) {
      // Pause current audio
      if (audio) {
        audio.pause();
        setCurrentlyPlaying(null);
      }
      return;
    }

    // Stop any currently playing audio
    if (audio) {
      audio.pause();
      audio.src = "";
    }

    try {
      // Use the proxy endpoint to stream audio with authentication
      const proxyUrl = `https://rihknnbvhukomiacgcxp.supabase.co/functions/v1/stream-audio-proxy?file=${encodeURIComponent(file.name)}`;
      const newAudio = new Audio(proxyUrl);
      
      newAudio.addEventListener('loadedmetadata', () => {
        setDuration(newAudio.duration);
      });

      newAudio.addEventListener('timeupdate', () => {
        setCurrentTime(newAudio.currentTime);
      });

      newAudio.addEventListener('ended', () => {
        setCurrentlyPlaying(null);
        setCurrentTime(0);
      });

      newAudio.addEventListener('error', () => {
        toast({
          variant: "destructive",
          title: "Playback error",
          description: "Unable to play this audio file.",
        });
        setCurrentlyPlaying(null);
        setCurrentTime(0);
      });

      await newAudio.play();
      setAudio(newAudio);
      setCurrentlyPlaying(file.name);
      
      toast({
        title: "Now playing",
        description: file.name,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Playback failed",
        description: "Unable to play audio file.",
      });
    }
  };

  const handleSeek = (value: number[]) => {
    if (audio && duration > 0) {
      const newTime = (value[0] / 100) * duration;
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const downloadFile = (file: StorageFile) => {
    // Use the proxy endpoint for downloads
    const proxyUrl = `https://rihknnbvhukomiacgcxp.supabase.co/functions/v1/stream-audio-proxy?file=${encodeURIComponent(file.name)}&download=true`;
    
    const link = document.createElement('a');
    link.href = proxyUrl;
    link.download = file.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download started",
      description: `Downloading ${file.name}`,
    });
  };

  const deleteFile = async (file: StorageFile) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(
        `https://rihknnbvhukomiacgcxp.supabase.co/functions/v1/stream-audio-proxy?file=${encodeURIComponent(file.name)}&delete=true`,
        { method: 'POST' }
      );

      const result = await response.json();
      
      if (result.success) {
        // Remove file from local state
        setFiles(prevFiles => prevFiles.filter(f => f.name !== file.name));
        
        toast({
          title: "File deleted",
          description: `${file.name} has been deleted successfully`,
        });
      } else {
        throw new Error(result.error || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: `Failed to delete ${file.name}`,
      });
    }
  };

  const openInNewTab = () => {
    window.open(STORAGE_URL, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Pre Records
          <div className="flex space-x-2">
            <Button onClick={fetchFiles} disabled={loading} size="sm" variant="outline">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            <Button onClick={openInNewTab} variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Storage
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Manage your prerecorded audio files - play, download, or delete content
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Audio File</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Modified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.name}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Music className="h-4 w-4 text-blue-500" />
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <span>{file.name}</span>
                          {currentlyPlaying === file.name && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Playing
                            </span>
                          )}
                        </div>
                        {currentlyPlaying === file.name && (
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{formatFileSize(file.size)}</TableCell>
                  <TableCell>{formatDate(file.modified)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => playAudio(file)}
                      >
                        {currentlyPlaying === file.name ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadFile(file)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteFile(file)}
                        className="hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {files.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No prerecorded files found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};