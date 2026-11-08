import { Link } from "@tanstack/react-router"
import type { LinkProps } from "@tanstack/react-router"
import {
  ChevronsUpDownIcon,
  LogOutIcon,
  SquareTerminalIcon,
} from "lucide-react"
import type { ReactNode } from "react"
import { Alert, AlertDescription } from "@/shared/ui/alert"
import { Avatar, AvatarFallback } from "@/shared/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import { Separator } from "@/shared/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/shared/ui/sidebar"

// The app shell from the sidebar-07 block, without the team switcher and project list.
// It knows no feature: the layout route passes the menu and the signed-in user (D6).

export type AppShellNavItem = {
  readonly label: string
  readonly to: LinkProps["to"]
  readonly icon: ReactNode
  readonly isActive: boolean
}

export type AppShellUser = { readonly name: string; readonly username: string }

type AppShellProps = {
  readonly appName: string
  readonly title: string
  readonly navItems: ReadonlyArray<AppShellNavItem>
  readonly user: AppShellUser
  readonly onSignOut: () => void
  readonly signOutPending: boolean
  readonly signOutFailed: boolean
  readonly children: ReactNode
}

const INITIALS_MAX_LETTERS = 2

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .slice(0, INITIALS_MAX_LETTERS)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
}

type UserMenuProps = Pick<
  AppShellProps,
  "user" | "onSignOut" | "signOutPending"
>

function UserMenu({ user, onSignOut, signOutPending }: UserMenuProps) {
  const { isMobile } = useSidebar()
  const initials = initialsOf(user.name)
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs">@{user.username}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-fit"
            side={isMobile ? "bottom" : "right"}
            align="end"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar>
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">@{user.username}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem disabled={signOutPending} onClick={onSignOut}>
                <LogOutIcon />
                {signOutPending ? "Keluar…" : "Keluar"}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export function AppShell({
  appName,
  title,
  navItems,
  user,
  onSignOut,
  signOutPending,
  signOutFailed,
  children,
}: AppShellProps) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" render={<Link to="/" />}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <SquareTerminalIcon className="size-4" />
                </div>
                <span className="truncate font-semibold">{appName}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    tooltip={item.label}
                    isActive={item.isActive}
                    render={<Link to={item.to} />}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <UserMenu
            user={user}
            onSignOut={onSignOut}
            signOutPending={signOutPending}
          />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-all ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <h1 className="text-sm font-medium">{title}</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {signOutFailed ? (
            <Alert variant="destructive">
              <AlertDescription>Gagal keluar. Coba lagi.</AlertDescription>
            </Alert>
          ) : null}
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
