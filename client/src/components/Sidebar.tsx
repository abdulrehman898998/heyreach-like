import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Home, 
  Users, 
  Target, 
  Settings
} from "lucide-react";
import cornectLogo from "@assets/Adobe Express - file_1754759149200.png";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Campaigns", href: "/campaigns", icon: Target },
  { name: "Accounts", href: "/accounts", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen shadow-sm">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <img 
            src={cornectLogo} 
            alt="Cornect" 
            className="h-8 w-auto"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href || 
                          (item.href !== "/" && location.startsWith(item.href));
          
          return (
            <Link key={item.name} href={item.href}>
              <div className={cn(
                "sidebar-nav-item",
                isActive && "active"
              )}>
                <item.icon className={cn(
                  "mr-3 h-5 w-5",
                  isActive ? "text-blue-700" : "text-gray-400"
                )} />
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          Cornect v1.0.0
        </div>
      </div>
    </div>
  );
}