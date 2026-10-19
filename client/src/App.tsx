import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import AppShell from "./components/AppShell";
import { ThemeProvider } from "./contexts/ThemeContext";
import MarketplacePage from "./pages/app/MarketplacePage";
import FacilityDetailsPage from "./pages/app/FacilityDetailsPage";
import MemberDashboardPage from "./pages/app/MemberDashboardPage";
import BusinessDashboardPage from "./pages/app/BusinessDashboardPage";
import BusinessMembersPage from "./pages/app/BusinessMembersPage";
import BusinessAttendancePage from "./pages/app/BusinessAttendancePage";
import BusinessChallengesPage from "./pages/app/BusinessChallengesPage";
import NotFound from "./pages/NotFound";
import "./app.css";

function AppRoutes() {
  return (
    <AppShell>
      <Switch>
        <Route path="/app">
          <Redirect to="/app/discover" />
        </Route>
        <Route path="/app/discover" component={MarketplacePage} />
        <Route path="/app/facilities/:id" component={FacilityDetailsPage} />
        <Route path="/app/member" component={MemberDashboardPage} />
        <Route path="/app/business" component={BusinessDashboardPage} />
        <Route path="/app/business/members" component={BusinessMembersPage} />
        <Route path="/app/business/attendance" component={BusinessAttendancePage} />
        <Route path="/app/business/challenges" component={BusinessChallengesPage} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <AppRoutes />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
