import { cn } from "@/lib/utils";

interface CardProps {
  title: string;
  description: string;
  className?: string;
}

export function Card({ title, description, className }: CardProps) {
  return (
    <div className={cn("rounded-xl border border-neutral-200 bg-white p-5 shadow-sm", className)}>
      <h3 className="text-sm font-semibold text-neutral-900 mb-1">{title}</h3>
      <p className="text-sm text-neutral-500">{description}</p>
    </div>
  );
}
