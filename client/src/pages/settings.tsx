import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, User, Shield, Bot, Database } from "lucide-react";

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="flex flex-col min-w-0 h-full">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <p className="text-slate-600">Manage your account and automation preferences</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-slate-600" />
                <CardTitle>Profile Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <div className="mt-1 text-sm text-slate-600">{user?.email || "Not provided"}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Name</label>
                  <div className="mt-1 text-sm text-slate-600">
                    {user?.firstName || user?.lastName 
                      ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
                      : "Not provided"
                    }
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-slate-600" />
                <CardTitle>Security</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-900">Authentication</h4>
                  <p className="text-sm text-slate-600">Managed through Replit Auth</p>
                </div>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = "/api/logout"}
                >
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Automation Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-slate-600" />
                <CardTitle>Automation Settings</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900">Default Message Delay</h4>
                    <p className="text-sm text-slate-600">Time between messages (seconds)</p>
                  </div>
                  <span className="text-sm font-medium">30s</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900">Messages Per Account</h4>
                    <p className="text-sm text-slate-600">Default limit per campaign</p>
                  </div>
                  <span className="text-sm font-medium">50</span>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Customize Defaults
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-slate-600" />
                <CardTitle>System Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Platform Version</label>
                  <div className="mt-1 text-sm text-slate-600">SocialBot Pro v1.0</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Browser Automation</label>
                  <div className="mt-1">
                    <Badge variant="outline">Playwright</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Database</label>
                  <div className="mt-1">
                    <Badge variant="default">PostgreSQL</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Account Created</label>
                  <div className="mt-1 text-sm text-slate-600">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}