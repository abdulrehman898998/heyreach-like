import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import CampaignsPage from "@/pages/campaigns";
import CreateCampaign from "@/pages/campaigns/create";
import Accounts from "@/pages/accounts";
import Analytics from "@/pages/analytics";
import SettingsPage from "@/pages/settings";

import LeadsPage from "@/pages/leads";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/layout/sidebar";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={LoginPage} />
      ) : (
        <div className="flex h-screen bg-slate-50">
          <Sidebar />
          <div className="flex-1">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/campaigns" component={CampaignsPage} />
              <Route path="/campaigns/create" component={CreateCampaign} />
              <Route path="/accounts" component={Accounts} />
              <Route path="/analytics" component={Analytics} />

              <Route path="/leads" component={LeadsPage} />
              <Route path="/settings" component={SettingsPage} />
              <Route component={NotFound} />
            </Switch>
          </div>
        </div>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
