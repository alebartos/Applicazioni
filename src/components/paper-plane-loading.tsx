import { Send } from "lucide-react";

export function PaperPlaneLoading({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-block ${className}`}>
      <Send className="w-4 h-4 text-primary-foreground animate-fly" />
    </div>
  );
}