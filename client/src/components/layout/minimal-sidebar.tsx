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
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-black">SocialMetrics</h1>
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
                  "w-full justify-start gap-3 h-10 font-normal",
                  isActive ? "bg-black text-white hover:bg-black hover:text-white" : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-200">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 h-10 font-normal text-gray-700 hover:bg-gray-100"
          onClick={() => window.location.href = '/api/logout'}
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}