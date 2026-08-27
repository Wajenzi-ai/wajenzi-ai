import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Agents from "@/pages/Agents";
import Catalogue from "@/pages/Catalogue";
import Files from "@/pages/Files";
import Implementation from "@/pages/Implementation";
import Locations from "@/pages/Locations";
import NotFound from "@/pages/NotFound";
import Offers from "@/pages/Offers";
import Marketplace from "@/pages/Marketplace";
import Procurement from "@/pages/Procurement";
import Submissions from "@/pages/Submissions";
import GuidedWorkspace from "@/pages/GuidedWorkspace";
import Approvals from "@/pages/Approvals";
import PersonaLanding from "@/pages/PersonaLanding";
import CollaborationHub from "@/pages/CollaborationHub";
import Projects from "@/pages/Projects";
import PostLoginLanding from "@/pages/PostLoginLanding";
import RfqBoard from "@/pages/RfqBoard";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/post-login"} component={PostLoginLanding} />
      <Route path={"/agents"} component={Agents} />
      <Route path={"/catalogue"} component={Catalogue} />
      <Route path={"/submissions"} component={Submissions} />
      <Route path={"/offers"} component={Offers} />
      <Route path={"/procurement"} component={Procurement} />
      <Route path={"/rfqs"} component={RfqBoard} />
      <Route path={"/locations"} component={Locations} />
      <Route path={"/files"} component={Files} />
      <Route path={"/implementation"} component={Implementation} />
      <Route path={"/projects"} component={Projects} />
      <Route path={"/site"}>{() => <GuidedWorkspace module="site" />}</Route>
      <Route path={"/boq"}>{() => <GuidedWorkspace module="boq" />}</Route>
      <Route path={"/rfqs"}>{() => <GuidedWorkspace module="rfqs" />}</Route>
      <Route path={"/deliveries"}>{() => <GuidedWorkspace module="deliveries" />}</Route>
      <Route path={"/finance"}>{() => <GuidedWorkspace module="finance" />}</Route>
      <Route path={"/approvals"} component={Approvals} />
      <Route path={"/pos"}>{() => <GuidedWorkspace module="pos" />}</Route>
      <Route path={"/inventory"}>{() => <GuidedWorkspace module="inventory" />}</Route>
      <Route path={"/reports"}>{() => <GuidedWorkspace module="reports" />}</Route>
      <Route path={"/quality"}>{() => <GuidedWorkspace module="quality" />}</Route>
      <Route path={"/operations"}>{() => <GuidedWorkspace module="operations" />}</Route>
      <Route path={"/marketplace"} component={Marketplace} />
      <Route path={"/client"}>{() => <PersonaLanding persona="client" />}</Route>
      <Route path={"/contractor"}>{() => <PersonaLanding persona="contractor" />}</Route>
      <Route path={"/developer"}>{() => <PersonaLanding persona="developer" />}</Route>
      <Route path={"/architect"}>{() => <PersonaLanding persona="architect" />}</Route>
      <Route path={"/engineer"}>{() => <PersonaLanding persona="engineer" />}</Route>
      <Route path={"/qs"}>{() => <PersonaLanding persona="quantity_surveyor" />}</Route>
      <Route path={"/project-manager"}>{() => <PersonaLanding persona="project_manager" />}</Route>
      <Route path={"/supplier"}>{() => <PersonaLanding persona="supplier" />}</Route>
      <Route path={"/manufacturer"}>{() => <PersonaLanding persona="manufacturer" />}</Route>
      <Route path={"/logistics"}>{() => <PersonaLanding persona="logistics" />}</Route>
      <Route path={"/financier"}>{() => <PersonaLanding persona="financier" />}</Route>
      <Route path={"/institution"}>{() => <PersonaLanding persona="institution" />}</Route>
      <Route path={"/admin"}>{() => <PersonaLanding persona="administrator" />}</Route>
      <Route path={"/operations"}>{() => <PersonaLanding persona="operations" />}</Route>
      <Route path={"/tasks"}>{() => <CollaborationHub kind="tasks" />}</Route>
      <Route path={"/messages"}>{() => <CollaborationHub kind="messages" />}</Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
