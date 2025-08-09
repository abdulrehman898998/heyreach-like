import { Route, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/dashboard";
import LeadsPage from "@/pages/leads";
import CreateCampaign from "@/pages/campaigns/create";
import CampaignsPage from "@/pages/campaigns/index";
import AccountsPage from "@/pages/accounts";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/leads" component={LeadsPage} />
          <Route path="/campaigns" component={CampaignsPage} />
          <Route path="/campaigns/create" component={CreateCampaign} />
          <Route path="/accounts" component={AccountsPage} />
          <Route>
            <div className="p-8 text-center">
              <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
              <p className="text-gray-600">The page you're looking for doesn't exist.</p>
            </div>
          </Route>
        </Switch>
      </Layout>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;