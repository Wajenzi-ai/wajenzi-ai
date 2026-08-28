import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { WorkspaceContext } from "@/contexts/WorkspaceContext";
import { dashboardNavigation } from "@/lib/wajenzi";
import { trpc } from "@/lib/trpc";
import { Bell, BriefcaseBusiness, ChevronLeft, Circle, FolderKanban, LifeBuoy, LogIn, Menu, PanelLeft, Search, Settings, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [expanded, setExpanded] = useState(true);
  const [workspaceAlerts, setWorkspaceAlerts] = useState(() => localStorage.getItem("wajenzi-workspace-alerts") !== "off");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(() => localStorage.getItem("wajenzi-profile-name") ?? "");
  const [defaultWorkspace, setDefaultWorkspace] = useState(() => localStorage.getItem("wajenzi-default-workspace") ?? "homeowner");
  const [organization, setOrganization] = useState(() => localStorage.getItem("wajenzi-active-organization") ?? "Wajenzi Construction Ltd");
  const [project, setProject] = useState(() => localStorage.getItem("wajenzi-active-project") ?? "Mombasa Road Residence");
  const [activeOrganizationId, setActiveOrganizationId] = useState<number | undefined>(() => { const id = Number(localStorage.getItem("wajenzi-active-organization-id")); return Number.isInteger(id) && id > 0 ? id : undefined; });
  const [activeProjectId, setActiveProjectId] = useState<number | undefined>(() => { const id = Number(localStorage.getItem("wajenzi-active-project-id")); return Number.isInteger(id) && id > 0 ? id : undefined; });
  const [organizationName, setOrganizationName] = useState("");
  const [organizationKind, setOrganizationKind] = useState<"homeowner" | "contractor" | "supplier" | "logistics" | "finance" | "platform">("contractor");
  const [projectName, setProjectName] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const isSupportRoute = location === "/app/support";
  const organizationMemberships = trpc.context.organizations.useQuery(undefined, { enabled: isAuthenticated });
  const projectMemberships = trpc.context.projects.useQuery({ organizationId: activeOrganizationId }, { enabled: isAuthenticated && Boolean(activeOrganizationId) });
  const utils = trpc.useUtils();
  const createOrganization = trpc.context.createOrganization.useMutation({ onSuccess: ({ organizationId }) => { const name = organizationName.trim(); setActiveOrganizationId(organizationId); setOrganization(name); localStorage.setItem("wajenzi-active-organization-id", String(organizationId)); localStorage.setItem("wajenzi-active-organization", name); setOrganizationName(""); utils.context.organizations.invalidate(); toast.success("Organization created. You are its owner."); }, onError: (error) => toast.error(error.message) });
  const createProject = trpc.context.createProject.useMutation({ onSuccess: ({ projectId }) => { const name = projectName.trim(); setActiveProjectId(projectId); setProject(name); localStorage.setItem("wajenzi-active-project-id", String(projectId)); localStorage.setItem("wajenzi-active-project", name); setProjectName(""); utils.context.projects.invalidate(); toast.success("Project created and added to your active role context."); }, onError: (error) => toast.error(error.message) });
  const activeItem = useMemo(
    () => dashboardNavigation.find((item) => location === item.path) ?? dashboardNavigation[0],
    [location],
  );
  const commandMatches = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    return dashboardNavigation.filter((item) => !query || `${item.label} ${item.role}`.toLowerCase().includes(query));
  }, [commandQuery]);
  const groupedNavigation = ["Role workspaces", "Coordination", "Platform"] as const;
  const accountName = profileName || (isAuthenticated ? user?.name ?? "Wajenzi member" : "Demo workspace");
  const accountEmail = isAuthenticated ? user?.email ?? "Signed-in Wajenzi user" : "Explore every role";
  const activeOrganization = organizationMemberships.data?.find((entry) => entry.organization.id === activeOrganizationId)?.organization;
  const activeProject = projectMemberships.data?.find((entry) => entry.project.id === activeProjectId)?.project;
  useEffect(() => { localStorage.setItem("wajenzi-last-workspace", activeItem.key); }, [activeItem.key]);
  useEffect(() => { if (!activeOrganizationId && organizationMemberships.data?.[0]) { const first = organizationMemberships.data[0].organization; setActiveOrganizationId(first.id); setOrganization(first.name); localStorage.setItem("wajenzi-active-organization-id", String(first.id)); localStorage.setItem("wajenzi-active-organization", first.name); } }, [activeOrganizationId, organizationMemberships.data]);
  useEffect(() => { if (!activeProjectId && projectMemberships.data?.[0]) { const first = projectMemberships.data[0].project; setActiveProjectId(first.id); setProject(first.name); localStorage.setItem("wajenzi-active-project-id", String(first.id)); localStorage.setItem("wajenzi-active-project", first.name); } }, [activeProjectId, projectMemberships.data]);
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen(true); } };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);
  const setAlertPreference = (enabled: boolean) => { setWorkspaceAlerts(enabled); localStorage.setItem("wajenzi-workspace-alerts", enabled ? "on" : "off"); };
  const selectWorkspace = (value: string) => { const next = dashboardNavigation.find((item) => item.key === value); if (!next) return; localStorage.setItem("wajenzi-last-workspace", next.key); setLocation(next.path); };
  const selectOrganization = (value: string) => { setOrganization(value); localStorage.setItem("wajenzi-active-organization", value); };
  const selectProject = (value: string) => { setProject(value); localStorage.setItem("wajenzi-active-project", value); };
  const selectMembershipOrganization = (value: string) => { const id = Number(value); const selected = organizationMemberships.data?.find((entry) => entry.organization.id === id)?.organization; setActiveOrganizationId(id); setActiveProjectId(undefined); if (selected) { setOrganization(selected.name); localStorage.setItem("wajenzi-active-organization", selected.name); } localStorage.setItem("wajenzi-active-organization-id", value); localStorage.removeItem("wajenzi-active-project-id"); };
  const selectMembershipProject = (value: string) => { const id = Number(value); const selected = projectMemberships.data?.find((entry) => entry.project.id === id)?.project; setActiveProjectId(id); if (selected) { setProject(selected.name); localStorage.setItem("wajenzi-active-project", selected.name); } localStorage.setItem("wajenzi-active-project-id", value); };
  const saveProfile = () => { localStorage.setItem("wajenzi-profile-name", profileName.trim()); localStorage.setItem("wajenzi-default-workspace", defaultWorkspace); setProfileOpen(false); toast.success("Profile and workspace preferences saved."); };

  return (
    <WorkspaceContext.Provider value={{ organizationId: activeOrganizationId, projectId: activeProjectId, organizationName: activeOrganization?.name ?? organization, projectName: activeProject?.name ?? project }}><div className="dashboard-shell min-h-screen overflow-x-hidden bg-background text-foreground"><SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <SidebarHeader className="px-3 pt-4 pb-3">
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => setLocation("/")} className="btn-press flex items-center gap-2 text-left" aria-label="Return to Wajenzi.AI home">
              <span className="grid size-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_9px_24px_-10px_rgba(246,178,49,.95)]"><span className="font-display text-sm font-bold">W</span></span>
              <span className="group-data-[collapsible=icon]:hidden"><span className="font-display block text-base font-bold tracking-[-0.07em]">Wajenzi<span className="text-sidebar-primary">.AI</span></span><span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-sidebar-foreground/55">Construction OS</span></span>
            </button>
            <button onClick={() => setExpanded(!expanded)} className="btn-press hidden rounded-lg p-1.5 text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:block group-data-[collapsible=icon]:hidden" aria-label="Collapse navigation"><ChevronLeft className={`size-4 transition-transform ${expanded ? "" : "rotate-180"}`} /></button>
          </div>
          <div className="mt-5 group-data-[collapsible=icon]:hidden">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/45">Role workspace</p>
            <Select value={activeItem.key} onValueChange={selectWorkspace}>
              <SelectTrigger className="h-10 border-sidebar-border bg-sidebar-accent/75 text-left text-sidebar-accent-foreground focus:ring-sidebar-ring"><SelectValue /></SelectTrigger>
              <SelectContent>{dashboardNavigation.map((item) => <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2 pb-4">
          {groupedNavigation.map((group) => (
            <div key={group} className="mb-5">
              <p className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[0.17em] text-sidebar-foreground/42 group-data-[collapsible=icon]:sr-only">{group}</p>
              <SidebarMenu>
                {dashboardNavigation.filter((item) => item.group === group).map((item) => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton isActive={item.path === location} onClick={() => setLocation(item.path)} tooltip={item.label} className="h-10 rounded-xl text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-[0_10px_20px_-16px_rgba(246,178,49,.8)]">
                      <item.icon className="size-4" /><span className="text-[13px] font-medium">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
          ))}
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border p-3">
          <div className="group-data-[collapsible=icon]:hidden"><div className="mb-3 flex items-center gap-2 rounded-xl bg-sidebar-accent/65 p-2.5"><Circle className="size-2 fill-emerald-400 text-emerald-400" /><span className="text-[11px] font-medium text-sidebar-foreground/75">System operational</span></div></div>
          <button onClick={() => setLocation("/app/support")} className="btn-press mb-2 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[11px] font-medium text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center" aria-label="Open customer support"><LifeBuoy className="size-4" /><span className="group-data-[collapsible=icon]:hidden">Customer support</span></button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="btn-press flex w-full items-center gap-2 rounded-xl px-1 py-1 text-left hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center" aria-label="Open account menu">
                <Avatar className="size-8 border border-sidebar-border"><AvatarFallback className="bg-sidebar-accent text-[10px] font-bold text-sidebar-primary">{accountName.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-xs font-semibold">{accountName}</p><p className="truncate text-[10px] text-sidebar-foreground/50">{accountEmail}</p></div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-64"><DropdownMenuLabel><p className="truncate text-sm">{accountName}</p><p className="mt-0.5 truncate text-xs font-normal text-muted-foreground">{accountEmail}</p></DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={() => setProfileOpen(true)}><UserRound className="mr-2 size-4" />Profile & workspace</DropdownMenuItem><DropdownMenuCheckboxItem checked={workspaceAlerts} onCheckedChange={setAlertPreference}><Settings className="mr-2 size-4" />Workspace alerts</DropdownMenuCheckboxItem><DropdownMenuSeparator />{isAuthenticated ? <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={logout}><LogIn className="mr-2 size-4 rotate-180" />Sign out</DropdownMenuItem> : <DropdownMenuItem onClick={() => startLogin()}><LogIn className="mr-2 size-4" />Sign in to Wajenzi.AI</DropdownMenuItem>}</DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0 overflow-x-hidden bg-background">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/75 bg-background/90 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3"><SidebarTrigger className="btn-press hidden rounded-lg sm:flex" aria-label="Toggle navigation"><PanelLeft className="size-4" /></SidebarTrigger><button className="btn-press rounded-lg p-2 sm:hidden" onClick={() => document.querySelector<HTMLButtonElement>("[data-sidebar='trigger']")?.click()} aria-label="Open navigation"><Menu className="size-4" /></button><div className="min-w-0"><p className="truncate font-display text-base font-semibold tracking-[-0.04em]">{isSupportRoute ? "Customer support" : activeItem.label}</p><p className="hidden truncate text-[10px] font-medium text-muted-foreground sm:block">{isSupportRoute ? "Auxiliary operations" : activeItem.role}</p></div></div>
          <div className="flex items-center gap-2"><div className="hidden items-center gap-2 xl:flex">{organizationMemberships.data?.length ? <Select value={String(activeOrganizationId ?? organizationMemberships.data[0].organization.id)} onValueChange={selectMembershipOrganization}><SelectTrigger aria-label="Select active organization" className="h-9 w-[184px] border-border bg-card text-xs text-card-foreground"><BriefcaseBusiness className="mr-1.5 size-3.5 text-primary" /><SelectValue placeholder={activeOrganization?.name ?? "Select organization"} /></SelectTrigger><SelectContent>{organizationMemberships.data.map((entry) => <SelectItem key={entry.membership.id} value={String(entry.organization.id)}>{entry.organization.name} · {entry.membership.workspaceRole.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select> : <Select value={organization} onValueChange={selectOrganization}><SelectTrigger aria-label="Select active organization" className="h-9 w-[184px] border-border bg-card text-xs text-card-foreground"><BriefcaseBusiness className="mr-1.5 size-3.5 text-primary" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Wajenzi Construction Ltd">Wajenzi Construction Ltd</SelectItem><SelectItem value="Nairobi Development Co.">Nairobi Development Co.</SelectItem><SelectItem value="Atlas Hardware Group">Atlas Hardware Group</SelectItem></SelectContent></Select>}{projectMemberships.data?.length ? <Select value={String(activeProjectId ?? projectMemberships.data[0].project.id)} onValueChange={selectMembershipProject}><SelectTrigger aria-label="Select active project" className="h-9 w-[190px] border-border bg-card text-xs text-card-foreground"><FolderKanban className="mr-1.5 size-3.5 text-primary" /><SelectValue placeholder={activeProject?.name ?? "Select project"} /></SelectTrigger><SelectContent>{projectMemberships.data.map((entry) => <SelectItem key={entry.membership.id} value={String(entry.project.id)}>{entry.project.name} · {entry.membership.projectRole.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select> : <Select value={project} onValueChange={selectProject}><SelectTrigger aria-label="Select active project" className="h-9 w-[190px] border-border bg-card text-xs text-card-foreground"><FolderKanban className="mr-1.5 size-3.5 text-primary" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Mombasa Road Residence">Mombasa Road Residence</SelectItem><SelectItem value="Westlands Offices">Westlands Offices</SelectItem><SelectItem value="Athi River Warehouse">Athi River Warehouse</SelectItem></SelectContent></Select>}</div><button onClick={() => setCommandOpen(true)} className="btn-press hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground transition hover:bg-muted md:flex"><Search className="size-3.5" /> Search workspace <kbd className="rounded border bg-muted px-1 text-[9px]">⌘ K</kbd></button><button onClick={() => toast("You have 3 items that need attention.")} className="btn-press relative grid size-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted" aria-label="View notifications"><Bell className="size-4" /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" /></button>{!isAuthenticated && <Button onClick={() => startLogin()} size="sm" className="btn-press hidden bg-primary font-semibold text-primary-foreground hover:bg-primary/90 sm:flex">Sign in</Button>}</div>
        </header>
        <main className="grid-fine min-h-[calc(100vh-4rem)] min-w-0 overflow-x-hidden p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle className="font-display tracking-[-.04em]">Profile & workspace</DialogTitle><DialogDescription>Preferences stay in this browser. Signed-in users can also establish their own organization and project membership context.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><label className="block text-xs font-bold">Display name<Input value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder={isAuthenticated ? user?.name ?? "Your name" : "Your name"} className="mt-2 h-10 rounded-xl" /></label><div><p className="text-xs font-bold">Default workspace</p><Select value={defaultWorkspace} onValueChange={setDefaultWorkspace}><SelectTrigger className="mt-2 h-10 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{dashboardNavigation.map((item) => <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>)}</SelectContent></Select></div>{isAuthenticated && <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3"><p className="text-xs font-bold">Organization and project context</p><div className="flex gap-2"><Input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder="New organization name" className="h-9 bg-background text-xs" /><Select value={organizationKind} onValueChange={(value) => setOrganizationKind(value as typeof organizationKind)}><SelectTrigger className="h-9 w-32 bg-background text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="homeowner">Homeowner</SelectItem><SelectItem value="contractor">Contractor</SelectItem><SelectItem value="supplier">Supplier</SelectItem><SelectItem value="logistics">Logistics</SelectItem><SelectItem value="finance">Finance</SelectItem><SelectItem value="platform">Platform</SelectItem></SelectContent></Select></div><Button size="sm" disabled={!organizationName.trim() || createOrganization.isPending} onClick={() => createOrganization.mutate({ name: organizationName.trim(), kind: organizationKind })} className="btn-press w-full bg-foreground text-background hover:bg-foreground/90">{createOrganization.isPending ? "Creating organization…" : "Create organization"}</Button><div className="border-t border-border pt-3"><Input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder={activeOrganizationId ? "New project name" : "Select or create an organization first"} disabled={!activeOrganizationId} className="h-9 bg-background text-xs" /><Button size="sm" disabled={!activeOrganizationId || !projectName.trim() || createProject.isPending} onClick={() => activeOrganizationId && createProject.mutate({ organizationId: activeOrganizationId, name: projectName.trim() })} className="btn-press mt-2 w-full bg-primary text-primary-foreground hover:bg-primary/90">{createProject.isPending ? "Creating project…" : "Create active project"}</Button></div></div>}</div><DialogFooter><Button variant="outline" onClick={() => setProfileOpen(false)} className="btn-press">Cancel</Button><Button onClick={saveProfile} className="btn-press bg-foreground text-background hover:bg-foreground/90">Save preferences</Button></DialogFooter></DialogContent>
      </Dialog>
      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="border-border bg-popover text-popover-foreground sm:max-w-lg"><DialogHeader><DialogTitle className="font-display tracking-[-.04em]">Command centre</DialogTitle><DialogDescription>Search your role workspaces and move to the next operating view.</DialogDescription></DialogHeader><Input autoFocus value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} placeholder="Search a role, workspace, or function" className="h-11 rounded-xl bg-background" /><div className="max-h-[360px] overflow-y-auto rounded-xl border border-border">{commandMatches.length ? commandMatches.map((item) => <button key={item.key} onClick={() => { selectWorkspace(item.key); setCommandOpen(false); setCommandQuery(""); }} className="btn-press flex w-full items-center gap-3 border-b border-border/70 px-4 py-3 text-left last:border-0 hover:bg-muted"><span className="grid size-8 place-items-center rounded-lg bg-primary/12 text-primary"><item.icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.label}</span><span className="block text-[11px] text-muted-foreground">{item.role}</span></span><span className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">{item.group}</span></button>) : <p className="px-4 py-8 text-center text-sm text-muted-foreground">No workspace matches that search.</p>}</div></DialogContent>
      </Dialog>
    </SidebarProvider></div></WorkspaceContext.Provider>
  );
}
