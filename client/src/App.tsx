import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import LoginPage from "@/pages/login";
import DashboardNew from "@/pages/dashboard-new";
import CampaignsPage from "@/pages/campaigns";
import CreateCampaignProfessional from "@/pages/campaigns/create-professional";
import ConfigureCampaign from "@/pages/campaigns/configure";
import Accounts from "@/pages/accounts";
import Analytics from "@/pages/analytics";
import SettingsPage from "@/pages/settings";

import LeadsProfessional from "@/pages/leads-professional";
import NotFound from "@/pages/not-found";
import { ProfessionalSidebar } from "@/components/layout/professional-sidebar";
import { ProfessionalHeader } from "@/components/layout/professional-header";

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
        <div className="flex h-screen bg-background">
          <ProfessionalSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <ProfessionalHeader />
            <main className="flex-1 overflow-y-auto">
              <Switch>
                <Route path="/" component={DashboardNew} />
                <Route path="/campaigns" component={CampaignsPage} />
                <Route path="/campaigns/create" component={CreateCampaignProfessional} />
                <Route path="/campaigns/configure" component={ConfigureCampaign} />
                <Route path="/accounts" component={Accounts} />
                <Route path="/analytics" component={Analytics} />
                <Route path="/leads" component={LeadsProfessional} />
                <Route path="/settings" component={SettingsPage} />
                <Route component={NotFound} />
              </Switch>
            </main>
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
