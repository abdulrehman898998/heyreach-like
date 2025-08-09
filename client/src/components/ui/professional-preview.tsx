import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VariableChip } from "@/components/ui/variable-chip";
import { cn } from "@/lib/utils";
import { Eye, Sparkles, ArrowRight } from "lucide-react";

interface ProfessionalPreviewProps {
  title: string;
  template: string;
  sampleData: Record<string, string>;
  className?: string;
  showVariables?: boolean;
}

export function ProfessionalPreview({
  title,
  template,
  sampleData,
  className,
  showVariables = true
}: ProfessionalPreviewProps) {
  // Extract variables from template
  const variables = Array.from(template.matchAll(/\{\{([^}]+)\}\}/g))
    .map(match => match[1].trim())
    .filter((value, index, self) => self.indexOf(value) === index);

  // Generate preview by replacing variables
  const generatePreview = () => {
    let preview = template;
    
    // Replace variables with sample data
    variables.forEach(variable => {
      const value = sampleData[variable] || `[${variable}]`;
      preview = preview.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), value);
    });
    
    return preview;
  };

  const preview = generatePreview();

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>
          Live preview with your sample data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Editor View */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Template
            </Badge>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg font-mono text-sm border">
            {template.split(/(\{\{[^}]+\}\})/).map((part, index) => {
              if (part.match(/\{\{[^}]+\}\}/)) {
                const variable = part.replace(/[{}]/g, '');
                return (
                  <VariableChip
                    key={index}
                    variable={variable}
                    className="mx-1"
                  />
                );
              }
              return <span key={index}>{part}</span>;
            })}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Preview Output */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-xs bg-green-100 text-green-800">
              <Sparkles className="h-3 w-3 mr-1" />
              Preview
            </Badge>
            <span className="text-xs text-muted-foreground">
              How it will appear to recipients
            </span>
          </div>
          <div className="p-4 bg-white border-2 border-green-200 rounded-lg">
            <div className="text-sm whitespace-pre-wrap">
              {preview || "Enter your template above to see preview..."}
            </div>
          </div>
        </div>

        {/* Variables Used */}
        {showVariables && variables.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Variables used ({variables.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {variables.map((variable) => (
                <VariableChip
                  key={variable}
                  variable={variable}
                  value={sampleData[variable]}
                  showValue={true}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}