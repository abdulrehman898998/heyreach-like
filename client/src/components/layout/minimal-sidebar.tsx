import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Target,
  Database,
  TrendingUp,
  Users,
  Settings
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Campaigns", href: "/campaigns", icon: Target },
  { title: "Leads", href: "/leads", icon: Database },
  { title: "Analytics", href: "/analytics", icon: TrendingUp },
  { title: "Accounts", href: "/accounts", icon: Users },
  { title: "Settings", href: "/settings", icon: Settings }
];

export function MinimalSidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-white/95 backdrop-blur-sm border-r border-border flex flex-col animate-fade-in">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 primary-gradient rounded-lg flex items-center justify-center">
            <span className="text-white font-semibold text-sm">SM</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">SocialMetrics</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 h-10 font-normal transition-all duration-200 hover-lift",
                  isActive ? "primary-gradient text-white shadow-md" : "text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{item.title}</span>
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 h-10 font-normal text-foreground hover:bg-muted/50 transition-all duration-200"
          onClick={() => window.location.href = '/api/logout'}
        >
          <span className="font-medium">Sign Out</span>
        </Button>
      </div>
    </div>
  );
}