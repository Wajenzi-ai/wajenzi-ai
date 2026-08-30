import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardWorkspace from "@/pages/DashboardWorkspace";
import Marketplace from "@/pages/Marketplace";
import { GitHubCanonicalCataloguePanel } from "@/components/GitHubCanonicalCataloguePanel";
import SupportCenter from "@/pages/SupportCenter";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import WorkspaceChooser from "@/pages/WorkspaceChooser";
import { getDashboardKeyForHostname, getDashboardPath, getEnvironmentForHostname } from "@/lib/subdomainRouting";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function HostEntry() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    const hostname = typeof window === "undefined" ? "" : window.location.hostname;
    const environment = getEnvironmentForHostname(hostname);
    const dashboard = getDashboardKeyForHostname(hostname);
    if (environment === "universal") setLocation("/app");
    else if (dashboard) setLocation(getDashboardPath(dashboard));
  }, [setLocation]);
  if (["public", "unknown"].includes(getEnvironmentForHostname(typeof window === "undefined" ? "" : window.location.hostname))) return <Home />;
  return <div className="min-h-screen bg-background" />;
}

function Router() {
  return <Switch><Route path="/" component={HostEntry} /><Route path="/marketplace">{() => <><Marketplace /><GitHubCanonicalCataloguePanel /></>}</Route><Route path="/app" component={WorkspaceChooser} /><Route path="/app/support" component={SupportCenter} /><Route path="/app/:workspace" component={DashboardWorkspace} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
