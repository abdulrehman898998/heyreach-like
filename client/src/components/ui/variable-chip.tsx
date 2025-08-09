import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Database, X } from "lucide-react";

interface VariableChipProps {
  variable: string;
  value?: string;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
  showValue?: boolean;
}

export function VariableChip({ 
  variable, 
  value, 
  onClick, 
  onRemove, 
  className,
  showValue = false 
}: VariableChipProps) {
  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <Database className="h-3 w-3" />
      <span>{variable}</span>
      {showValue && value && (
        <>
          <span className="text-blue-400">:</span>
          <span className="text-blue-600 font-normal max-w-20 truncate">{value}</span>
        </>
      )}
      {onRemove && (
        <X 
          className="h-3 w-3 hover:text-red-500 ml-1" 
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        />
      )}
    </Badge>
  );
}