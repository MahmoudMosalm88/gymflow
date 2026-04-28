"use client"

import { useTheme } from "next-themes"
import { useContext } from "react"
import { Toaster as Sonner } from "sonner"
import { LangContext } from "@/lib/i18n"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const { lang } = useContext(LangContext)

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position={lang === "ar" ? "top-left" : "top-right"}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-2 group-[.toaster]:border-border group-[.toaster]:shadow-[6px_6px_0_hsl(var(--foreground)/0.15)] group-[.toaster]:rounded-none",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-none",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-none",
          success: "group-[.toaster]:border-2 group-[.toaster]:border-[#4ade80]/40 group-[.toaster]:bg-[#0d2b1a] group-[.toaster]:text-[#4ade80]",
          error: "group-[.toaster]:border-2 group-[.toaster]:border-destructive/50 group-[.toaster]:bg-destructive/10 group-[.toaster]:text-destructive",
          warning: "group-[.toaster]:border-2 group-[.toaster]:border-[#f59e0b]/40 group-[.toaster]:bg-[#2b2410] group-[.toaster]:text-[#f59e0b]",
          info: "group-[.toaster]:border-2 group-[.toaster]:border-foreground/20 group-[.toaster]:bg-foreground/5 group-[.toaster]:text-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
