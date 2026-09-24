import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-none group-[.toaster]:border-x-0 group-[.toaster]:border-y group-[.toaster]:border-border group-[.toaster]:bg-background group-[.toaster]:font-sans group-[.toaster]:text-[12px] group-[.toaster]:font-medium group-[.toaster]:text-foreground group-[.toaster]:shadow-none",
          title: "group-[.toast]:font-serif group-[.toast]:text-[17px] group-[.toast]:font-normal",
          description: "group-[.toast]:text-[11px] group-[.toast]:leading-5 group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:border-accent/45",
          error: "group-[.toaster]:border-destructive/45",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
