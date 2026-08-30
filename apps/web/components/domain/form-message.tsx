import { cn } from "@/lib/utils";

export interface FormMessageProps {
  error?: string;
  success?: string;
}

/** Renders a useActionState AuthActionState result. Shared across every auth form. */
export function FormMessage({ error, success }: FormMessageProps) {
  if (!error && !success) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        error && "border-red-200 bg-red-50 text-red-800",
        success && "border-green-200 bg-green-50 text-green-800"
      )}
    >
      {error ?? success}
    </p>
  );
}
