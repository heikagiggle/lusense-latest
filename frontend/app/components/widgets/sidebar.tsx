"use client";

import React, { useState } from "react";
import {
  Home,
  Search,
  Camera,
  LayoutDashboard,
  User,
  PlusSquare,
  Settings,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Logo } from "../icons/logo";
import { CameraModal } from "../camera-analysis-modal";
// import { CameraModal } from "@/components/ca/";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string | null;
  featured?: boolean;
  action?: "camera";
}

const desktopItems: NavItem[] = [
  { icon: Home, label: "Home", href: "/" },
  { icon: PlusSquare, label: "Upload", href: "#upload" },
  {
    icon: Camera,
    label: "AI Scan",
    href: null,
    featured: true,
    action: "camera",
  },
  { icon: LayoutDashboard, label: "Projects", href: "#projects" },
  { icon: User, label: "Profile", href: "#profile" },
];

const mobileItems: NavItem[] = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Search, label: "Search", href: "#search" },
  {
    icon: Camera,
    label: "AI Scan",
    href: null,
    featured: true,
    action: "camera",
  },
  { icon: PlusSquare, label: "Upload", href: "#upload" },
  { icon: User, label: "Profile", href: "#profile" },
];

const bottomItems: NavItem[] = [
  { icon: Settings, label: "Settings & Support", href: "#settings" },
];

export function Sidebar() {
  const [cameraOpen, setCameraOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={0}>
      {/* Desktop */}
      <aside
        className="hidden md:flex fixed left-0 z-40 w-20 h-screen border-r border-gray-200 bg-white
          dark:border-gray-800 dark:bg-black flex-col items-center py-8"
      >
        <Link
          href="/"
          className="h-10 w-10 flex items-center justify-center mb-8"
        >
          <Logo />
        </Link>

        <div className="flex flex-col space-y-6">
          {desktopItems.map((item) => (
            <NavIcon
              key={item.label}
              item={item}
              onCamera={() => setCameraOpen(true)}
            />
          ))}
        </div>

        <div className="flex-1" />

        <div className="flex flex-col space-y-6">
          {bottomItems.map((item) => (
            <NavIcon
              key={item.label}
              item={item}
              onCamera={() => setCameraOpen(true)}
            />
          ))}
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 z-50 w-full h-16 border-t border-gray-200
          bg-white dark:border-gray-800 dark:bg-black flex items-center justify-around px-2"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {mobileItems.map((item) => (
          <NavIcon
            key={item.label}
            item={item}
            mobile
            onCamera={() => setCameraOpen(true)}
          />
        ))}
      </nav>

      <CameraModal open={cameraOpen} onClose={() => setCameraOpen(false)} />
    </TooltipProvider>
  );
}

function NavIcon({
  item,
  mobile = false,
  onCamera,
}: {
  item: NavItem;
  mobile?: boolean;
  onCamera: () => void;
}) {
  const Icon = item.icon;

  const cls = cn(
    "p-3 rounded-xl transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-900",
    "group flex items-center justify-center",
    item.featured &&
      !mobile &&
      "bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700",
    item.featured &&
      mobile &&
      "bg-gray-900 text-white rounded-full -mt-10 h-14 w-14 shadow-xl border-4 border-white dark:border-black",
  );

  const iconCls = cn(
    "h-6 w-6 text-gray-600 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white",
    item.featured && mobile && "text-white group-hover:text-white h-7 w-7",
  );

  const el =
    item.action === "camera" ? (
      <button onClick={onCamera} className={cls} aria-label="Open AI Scan">
        <Icon className={iconCls} />
      </button>
    ) : item.href ? (
      <Link href={item.href} className={cls}>
        <Icon className={iconCls} />
      </Link>
    ) : null;

  if (!el) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{el}</TooltipTrigger>
      {!mobile && (
        <TooltipContent
          side="right"
          className="bg-gray-800 text-white border-none ml-2 font-medium"
        >
          <p>{item.label}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
