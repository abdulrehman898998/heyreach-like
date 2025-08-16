import React, { useState } from 'react';
import { Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Sidebar from './components/layout/professional-sidebar';
import DashboardProfessional from './pages/dashboard-professional';
import Accounts from './pages/accounts';
import Leads from './pages/leads';
import Campaigns from './pages/campaigns';

import CreateCampaign from './pages/campaigns/create';
import EditCampaign from './pages/campaigns/edit';
import CampaignAnalytics from './pages/campaigns/analytics';
import './styles/globals.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true, // Enable refetch on window focus
      staleTime: 5 * 60 * 1000, // 5 minutes instead of default 0
    },
  },
});

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="main-container">
        {/* Sidebar */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        
        {/* Main Content */}
        <div className="main-content">
          {/* Page Content */}
          <div className="p-6">
            <Switch>
              <Route path="/" component={DashboardProfessional} />
              <Route path="/accounts" component={Accounts} />
              <Route path="/leads" component={Leads} />
              <Route path="/campaigns" component={Campaigns} />
              <Route path="/campaigns/create" component={CreateCampaign} />
              <Route path="/campaigns/:id/edit" component={EditCampaign} />
              <Route path="/campaigns/:id/analytics" component={CampaignAnalytics} />
            </Switch>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;