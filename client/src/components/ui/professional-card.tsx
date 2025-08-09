import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ProfessionalCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  icon?: ReactNode;
  badge?: string;
  action?: ReactNode;
  className?: string;
  variant?: "default" | "gradient" | "outlined";
}

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  className?: string;
}

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  className?: string;
  action?: ReactNode;
}

export function ProfessionalCard({
  title,
  description,
  children,
  icon,
  badge,
  action,
  className,
  variant = "default"
}: ProfessionalCardProps) {
  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-lg",
      variant === "gradient" && "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20",
      variant === "outlined" && "border-2 border-primary/20",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {icon && (
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-lg",
                variant === "gradient" ? "bg-primary/20" : "bg-muted"
              )}>
                {icon}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                {badge && (
                  <Badge variant="secondary" className="text-xs">
                    {badge}
                  </Badge>
                )}
              </div>
              {description && (
                <CardDescription className="mt-1">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
          {action && (
            <div className="flex-shrink-0">
              {action}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

export function MetricCard({
  title,
  value,
  description,
  icon,
  trend,
  className
}: MetricCardProps) {
  const TrendIcon = trend?.isPositive ? TrendingUp : trend?.isPositive === false ? TrendingDown : Minus;
  
  return (
    <Card className={cn("transition-all duration-200 hover:shadow-md", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {description && (
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              )}
            </div>
          </div>
        </div>
        
        {trend && (
          <div className="flex items-center gap-1 mt-4">
            <TrendIcon className={cn(
              "h-4 w-4",
              trend.isPositive ? "text-green-600" : trend.isPositive === false ? "text-red-600" : "text-gray-600"
            )} />
            <span className={cn(
              "text-sm font-medium",
              trend.isPositive ? "text-green-600" : trend.isPositive === false ? "text-red-600" : "text-gray-600"
            )}>
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </span>
            <span className="text-sm text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StatsCard({
  title,
  value,
  icon,
  description,
  trend,
  className,
  action
}: StatsCardProps) {
  const TrendIcon = trend?.isPositive ? TrendingUp : trend?.isPositive === false ? TrendingDown : Minus;
  
  return (
    <Card className={cn("transition-all duration-200 hover:shadow-md", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
            </div>
          </div>
          {action}
        </div>
        
        <div className="space-y-2">
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          
          {trend && (
            <div className="flex items-center gap-1">
              <TrendIcon className={cn(
                "h-4 w-4",
                trend.isPositive ? "text-green-600" : trend.isPositive === false ? "text-red-600" : "text-muted-foreground"
              )} />
              <span className={cn(
                "text-sm font-medium",
                trend.isPositive ? "text-green-600" : trend.isPositive === false ? "text-red-600" : "text-muted-foreground"
              )}>
                {trend.value > 0 ? '+' : ''}{trend.value}%
              </span>
              <span className="text-sm text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}