import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Settings,
  User,
  LogOut,
  HelpCircle,
  Search,
  Zap
} from "lucide-react";

interface ProfessionalHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function ProfessionalHeader({ title, subtitle, actions }: ProfessionalHeaderProps) {

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Page Info */}
        <div className="flex items-center gap-4">
          {title && (
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
          )}
        </div>

        {/* Actions and User Menu */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search campaigns, leads..."
              className="pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Custom Actions */}
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
              3
            </Badge>
          </Button>

          {/* User Menu */}
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 h-10 px-2"
            onClick={() => window.location.href = '/api/logout'}
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
              U
            </div>
            <div className="hidden md:block text-left">
              <div className="text-sm font-medium">User Account</div>
              <div className="text-xs text-muted-foreground">Professional Plan</div>
            </div>
          </Button>
        </div>
      </div>
    </header>
  );
}