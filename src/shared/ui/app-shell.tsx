import { Link, useMatchRoute } from "@tanstack/react-router"
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
// It knows no feature and holds no feature text: the layout route passes the menu, the
// signed-in user, and every label (D6; review T3 S2).

export type AppShellNavItem = {
  readonly label: string
  readonly to: LinkProps["to"]
  readonly icon: ReactNode
}

export type AppShellUser = { readonly name: string; readonly username: string }

export type AppShellLabels = {
  readonly navigation: string
  readonly toggleSidebar: string
  readonly signOut: string
  readonly signingOut: string
}

type AppShellProps = {
  readonly appName: string
  readonly homeTo: LinkProps["to"]
  readonly title: string
  readonly navItems: ReadonlyArray<AppShellNavItem>
  readonly user: AppShellUser
  readonly labels: AppShellLabels
  readonly onSignOut: () => void
  readonly isSigningOut: boolean
  readonly signOutError: string | undefined
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

type UserIdentityProps = { readonly user: AppShellUser }

function UserIdentity({ user }: UserIdentityProps) {
  return (
    <>
      <Avatar>
        <AvatarFallback>{initialsOf(user.name)}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{user.name}</span>
        <span className="truncate text-xs">@{user.username}</span>
      </div>
    </>
  )
}

type UserMenuProps = Pick<
  AppShellProps,
  "user" | "labels" | "onSignOut" | "isSigningOut"
>

function UserMenu({ user, labels, onSignOut, isSigningOut }: UserMenuProps) {
  const { isMobile } = useSidebar()
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <UserIdentity user={user} />
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
                  <UserIdentity user={user} />
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem disabled={isSigningOut} onClick={onSignOut}>
                <LogOutIcon />
                {isSigningOut ? labels.signingOut : labels.signOut}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

type MainNavProps = Pick<AppShellProps, "navItems" | "labels">

function MainNav({ navItems, labels }: MainNavProps) {
  // The router decides which item is current, so nested paths keep working (review T3 nit 6).
  const matchRoute = useMatchRoute()
  return (
    <nav aria-label={labels.navigation}>
      <SidebarGroup>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                tooltip={item.label}
                isActive={matchRoute({ to: item.to }) !== false}
                render={<Link to={item.to} />}
              >
                {item.icon}
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    </nav>
  )
}

export function AppShell({
  appName,
  homeTo,
  title,
  navItems,
  user,
  labels,
  onSignOut,
  isSigningOut,
  signOutError,
  children,
}: AppShellProps) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" render={<Link to={homeTo} />}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <SquareTerminalIcon className="size-4" />
                </div>
                <span className="truncate font-semibold">{appName}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <MainNav navItems={navItems} labels={labels} />
        </SidebarContent>
        <SidebarFooter>
          <UserMenu
            user={user}
            labels={labels}
            onSignOut={onSignOut}
            isSigningOut={isSigningOut}
          />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-all ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger
              className="-ml-1"
              aria-label={labels.toggleSidebar}
            />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <h1 className="text-sm font-medium">{title}</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {signOutError === undefined ? null : (
            <Alert variant="destructive">
              <AlertDescription>{signOutError}</AlertDescription>
            </Alert>
          )}
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
