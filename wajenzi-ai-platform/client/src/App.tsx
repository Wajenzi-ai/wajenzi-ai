import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardWorkspace from "@/pages/DashboardWorkspace";
import Marketplace from "@/pages/Marketplace";
import { GitHubCanonicalCataloguePanel } from "@/components/GitHubCanonicalCataloguePanel";
import SupportCenter from "@/pages/SupportCenter";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return <Switch><Route path="/" component={Home} /><Route path="/marketplace">{() => <><Marketplace /><GitHubCanonicalCataloguePanel /></>}</Route><Route path="/app/support" component={SupportCenter} /><Route path="/app/:workspace" component={DashboardWorkspace} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
