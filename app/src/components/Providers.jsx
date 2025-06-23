"use client"

import React from "react"
import { HeroUIProvider, ToastProvider } from "@heroui/react"
import { SessionProvider } from "next-auth/react"
import PropTypes from "prop-types"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { CheckCircle2, AlertCircle } from "lucide-react"

function Providers({ children }) {
  return (
    <HeroUIProvider>
      <NextThemesProvider attribute="class" defaultTheme="dark">
        <SessionProvider>{children}</SessionProvider>
      </NextThemesProvider>
      <ToastProvider
        placement="bottom-right"
        toastProps={{
          radius: "md",
          color: "primary",
          variant: "flat",
          timeout: 2000,
          hideIcon: false,
          classNames: {
            base: "flex items-center px-[10px] py-[6px] bg-white border border-[#e0e0e0] rounded-[8px] shadow-[0_2px_4px_rgba(0,0,0,0.1)] mt-[50px]",
            title: "font-bold mr-[10px]",
            closeButton:
              "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
            icon: "mr-[10px]",
          },
          renderIcon: ({ type }) => {
            if (type === "success") {
              return <CheckCircle2 className="w-5 h-5 text-green-500" />
            }
            if (type === "error" || type === "danger") {
              return <AlertCircle className="w-5 h-5 text-red-500" />
            }
            return null
          },
        }}
      />
    </HeroUIProvider>
  )
}

Providers.propTypes = {
  children: PropTypes.node.isRequired,
}

export default Providers
