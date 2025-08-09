import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, AlertCircle, XCircle, Play, Pause } from "lucide-react";

interface StatusBadgeProps {
  status: 'active' | 'paused' | 'completed' | 'failed' | 'pending' | 'running';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    active: {
      icon: CheckCircle2,
      label: "Active",
      variant: "default" as const,
      className: "bg-green-100 text-green-800 border-green-200"
    },
    paused: {
      icon: Pause,
      label: "Paused", 
      variant: "secondary" as const,
      className: "bg-yellow-100 text-yellow-800 border-yellow-200"
    },
    completed: {
      icon: CheckCircle2,
      label: "Completed",
      variant: "default" as const,
      className: "bg-blue-100 text-blue-800 border-blue-200"
    },
    failed: {
      icon: XCircle,
      label: "Failed",
      variant: "destructive" as const,
      className: "bg-red-100 text-red-800 border-red-200"
    },
    pending: {
      icon: Clock,
      label: "Pending",
      variant: "outline" as const,
      className: "bg-gray-100 text-gray-800 border-gray-200"
    },
    running: {
      icon: Play,
      label: "Running",
      variant: "default" as const,
      className: "bg-purple-100 text-purple-800 border-purple-200"
    }
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={cn(
        "flex items-center gap-1 text-xs font-medium",
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}