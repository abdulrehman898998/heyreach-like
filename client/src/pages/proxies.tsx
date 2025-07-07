import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProxySchema, type Proxy } from "@shared/schema";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Server, Wifi, WifiOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const addProxySchema = z.object({
  proxyUrl: z.string().min(1, "Proxy URL is required"),
});

type AddProxyForm = z.infer<typeof addProxySchema>;

export default function Proxies() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProxy, setEditingProxy] = useState<Proxy | null>(null);
  const { toast } = useToast();

  const { data: proxies = [], isLoading } = useQuery({
    queryKey: ["/api/proxies"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: AddProxyForm) => {
      // Parse proxy URL to extract components
      let host, port, username, password;
      
      try {
        // Handle URLs with special characters by URL encoding first
        let urlToTest = data.proxyUrl;
        
        // If it looks like a complete proxy URL but fails parsing, try encoding special chars
        if (urlToTest.includes('@') && urlToTest.includes('://')) {
          const url = new URL(urlToTest);
          host = url.hostname;
          port = parseInt(url.port) || 80;
          username = decodeURIComponent(url.username) || null;
          password = decodeURIComponent(url.password) || null;
        } else {
          throw new Error('Not a complete URL');
        }
      } catch (error) {
        console.log('URL parsing failed, trying manual parsing:', error.message);
        
        // Manual parsing for complex URLs with special characters
        if (data.proxyUrl.includes('://') && data.proxyUrl.includes('@')) {
          // Format: http://user:pass@host:port
          const protocolSplit = data.proxyUrl.split('://');
          if (protocolSplit.length === 2) {
            const remainder = protocolSplit[1]; // user:pass@host:port
            const atSplit = remainder.split('@');
            if (atSplit.length === 2) {
              const authPart = atSplit[0]; // user:pass
              const hostPart = atSplit[1]; // host:port
              
              const authSplit = authPart.split(':');
              username = authSplit[0] || null;
              password = authSplit.slice(1).join(':') || null; // Join in case password contains ':'
              
              const hostSplit = hostPart.split(':');
              host = hostSplit[0];
              port = parseInt(hostSplit[1]) || 80;
            } else {
              throw new Error('Invalid proxy URL format - missing @ separator');
            }
          } else {
            throw new Error('Invalid proxy URL format - invalid protocol');
          }
        } else {
          // Fallback for simple host:port format
          const parts = data.proxyUrl.split(':');
          if (parts.length === 2) {
            host = parts[0];
            port = parseInt(parts[1]);
            username = null;
            password = null;
          } else {
            throw new Error('Invalid proxy URL format - use http://user:pass@host:port or host:port');
          }
        }
      }
      
      const proxyData = {
        name: `${host}:${port}`,
        host,
        port,
        username,
        password,
        isActive: true,
      };

      const response = await fetch("/api/proxies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(proxyData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Network error" }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proxies"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Proxy added successfully",
      });
    },
    onError: (error: any) => {
      console.error('Proxy add error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add proxy",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Proxy> & { id: number }) => {
      const response = await apiRequest(`/api/proxies/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proxies"] });
      toast({
        title: "Success",
        description: "Proxy updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update proxy",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/proxies/${id}`, {
        method: "DELETE",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proxies"] });
      toast({
        title: "Success",
        description: "Proxy deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete proxy",
        variant: "destructive",
      });
    },
  });

  const form = useForm<AddProxyForm>({
    resolver: zodResolver(addProxySchema),
    defaultValues: {
      proxyUrl: "",
    },
  });

  const onSubmit = (data: AddProxyForm) => {
    addMutation.mutate(data);
  };

  const toggleProxyStatus = (proxy: Proxy) => {
    updateMutation.mutate({
      id: proxy.id,
      isActive: !proxy.isActive,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Server className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Proxy Management</h1>
        </div>
        <div className="text-center py-8">Loading proxies...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Server className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Proxy Management</h1>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Proxy
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Proxy</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="proxyUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proxy URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="http://username:password@host:port or host:port" 
                          {...field} 
                        />
                      </FormControl>
                      <p className="text-xs text-gray-500 mt-1">
                        Examples: http://user:pass@proxy.com:8080 or 192.168.1.100:3128
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addMutation.isPending}>
                    {addMutation.isPending ? "Adding..." : "Add Proxy"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {proxies.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Server className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No proxies configured</h3>
            <p className="text-gray-500 mb-4">
              Add proxy servers to rotate through during automation for better performance and avoiding rate limits.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Proxy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {proxies.map((proxy: Proxy) => (
            <Card key={proxy.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center">
                      {proxy.isActive ? (
                        <Wifi className="w-5 h-5 text-green-500" />
                      ) : (
                        <WifiOff className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-900">{proxy.name}</h3>
                      <p className="text-sm text-gray-500">
                        {proxy.host}:{proxy.port}
                        {proxy.username && (
                          <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                            Auth: {proxy.username}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Active</span>
                      <Switch
                        checked={proxy.isActive}
                        onCheckedChange={() => toggleProxyStatus(proxy)}
                        disabled={updateMutation.isPending}
                      />
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(proxy.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>About Proxy Rotation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>• Proxies are automatically rotated during automation campaigns</p>
          <p>• Only active proxies will be used in the rotation</p>
          <p>• Proxy rotation helps avoid rate limits and improves success rates</p>
          <p>• Authentication credentials are encrypted and stored securely</p>
          <p>• Test your proxies before running campaigns to ensure they work properly</p>
        </CardContent>
      </Card>
    </div>
  );
}