import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  TrendingUp,
  Settings,
  Database,
  Target,
  Zap,
  ChevronLeft,
  ChevronRight,
  Plus,
  Bell
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  description?: string;
}

const navigation: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    description: "Overview and analytics"
  },
  {
    title: "Campaigns",
    href: "/campaigns",
    icon: Target,
    badge: "3",
    description: "Manage outreach campaigns"
  },
  {
    title: "Leads",
    href: "/leads",
    icon: Database,
    description: "Upload and manage contacts"
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: TrendingUp,
    description: "Performance insights"
  },
  {
    title: "Accounts",
    href: "/accounts",
    icon: Users,
    description: "Connected social accounts"
  }
];

const bottomNavigation: NavItem[] = [
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    description: "App configuration"
  }
];

interface ProfessionalSidebarProps {
  className?: string;
}

export function ProfessionalSidebar({ className }: ProfessionalSidebarProps) {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const NavItemComponent = ({ item }: { item: NavItem }) => {
    const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
    const Icon = item.icon;

    return (
      <Link href={item.href}>
        <Button
          variant={isActive ? "default" : "ghost"}
          className={cn(
            "w-full justify-start gap-3 h-12 transition-all duration-200",
            isActive && "bg-primary text-primary-foreground shadow-md",
            !isActive && "hover:bg-muted/50",
            isCollapsed && "px-3"
          )}
        >
          <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-primary-foreground")} />
          {!isCollapsed && (
            <>
              <div className="flex-1 text-left">
                <div className="font-medium">{item.title}</div>
                {item.description && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </div>
                )}
              </div>
              {item.badge && (
                <Badge variant="secondary" className="h-5 px-2 text-xs">
                  {item.badge}
                </Badge>
              )}
            </>
          )}
        </Button>
      </Link>
    );
  };

  return (
    <div className={cn(
      "flex flex-col bg-card border-r border-border transition-all duration-300",
      isCollapsed ? "w-16" : "w-72",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">SocialMetrics</h2>
                <p className="text-xs text-muted-foreground">Outreach Platform</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 p-0"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      {!isCollapsed && (
        <div className="p-4 border-b border-border">
          <div className="space-y-2">
            <Link href="/campaigns/create">
              <Button className="w-full gap-2 bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                New Campaign
              </Button>
            </Link>
            <Link href="/leads">
              <Button variant="outline" className="w-full gap-2">
                <Database className="h-4 w-4" />
                Upload Leads
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => (
          <NavItemComponent key={item.href} item={item} />
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="p-4 border-t border-border space-y-2">
        {bottomNavigation.map((item) => (
          <NavItemComponent key={item.href} item={item} />
        ))}
        
        {/* Notifications */}
        {!isCollapsed && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Notifications</span>
            </div>
            <p className="text-xs text-muted-foreground">
              3 campaigns completed successfully
            </p>
          </div>
        )}
      </div>
    </div>
  );
}