import {
  createRouter,
  RootRoute,
  Route,
  Navigate,
  lazyRouteComponent,
} from "@tanstack/react-router";
import App from "./App";
import { getBasePath } from "./api/config";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";

// Import Admin views (keeping only non-lazy loaded ones)
import AdminSeries from "./views/admin/Series";
import AdminSeriesDetail from "./views/admin/SeriesDetail";
import AdminTeams from "./views/admin/Teams";
import AdminCourses from "./views/admin/Courses";
import AdminCompetitions from "./views/admin/Competitions";
import AdminCompetitionTeeTimes from "./views/admin/CompetitionTeeTimes.tsx";
import AdminCompetitionGroups from "./views/admin/AdminCompetitionGroups";
import AdminManualScoreEntry from "./views/admin/AdminManualScoreEntry";
import AdminPointTemplates from "./views/admin/PointTemplates";
import AdminTours from "./views/admin/Tours";
import AdminTourDetail from "./views/admin/TourDetail";

// Import Player views (keeping only non-lazy loaded ones)
import PlayerLayout from "./views/player/PlayerLayout";
import PlayerLanding from "./views/player/Landing";

import PlayerCompetitions from "./views/player/Competitions";
import PlayerSeries from "./views/player/Series";
import PlayerTours from "./views/player/Tours";
import SeriesDetail from "./views/player/SeriesDetail";
import SeriesDocuments from "./views/player/SeriesDocuments";
import SeriesDocumentDetail from "./views/player/SeriesDocumentDetail";
import SeriesStandings from "./views/player/SeriesStandings";
import SeriesCompetitions from "./views/player/SeriesCompetitions";
import TourDetail from "./views/player/TourDetail";
import TourDocuments from "./views/player/TourDocuments";
import TourDocumentDetail from "./views/player/TourDocumentDetail";
import TourCompetitions from "./views/player/TourCompetitions";
import TourStandings from "./views/player/TourStandings";
import MyProfile from "./views/player/MyProfile";
import PlayerPublicProfile from "./views/player/PlayerPublicProfile";

// Import Auth views
import Login from "./views/auth/Login";
import Register from "./views/auth/Register";

// Root route
const rootRoute = new RootRoute({
  component: App,
});

// Admin routes
const adminRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/admin",
  pendingComponent: LoadingSpinner,
  component: lazyRouteComponent(() => import("./views/admin/AdminLayout")),
});

const adminSeriesRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/series",
  component: AdminSeries,
});

const adminSeriesDetailRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/series/$serieId",
  component: AdminSeriesDetail,
});

const adminTeamsRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/teams",
  component: AdminTeams,
});

const adminCoursesRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/courses",
  component: AdminCourses,
});

const adminCompetitionsRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/competitions",
  component: AdminCompetitions,
});

const adminCompetitionTeeTimesRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/competitions/$competitionId/tee-times",
  component: AdminCompetitionTeeTimes,
});

const adminManualScoreEntryRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/competitions/$competitionId/manual-scores",
  component: AdminManualScoreEntry,
});

const adminCompetitionGroupsRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/competitions/$competitionId/groups",
  component: AdminCompetitionGroups,
});

const adminPointTemplatesRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/point-templates",
  component: AdminPointTemplates,
});

const adminToursRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/tours",
  component: AdminTours,
});

const adminTourDetailRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/tours/$id",
  component: AdminTourDetail,
});

// Player routes
const playerRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/player",
  component: PlayerLayout,
});

const playerLandingRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/",
  component: PlayerLanding,
});

const playerCompetitionsRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/competitions",
  component: PlayerCompetitions,
});

const playerSeriesRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/series",
  component: PlayerSeries,
});

const playerToursRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/tours",
  component: PlayerTours,
});

const seriesDetailRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/series/$serieId",
  component: SeriesDetail,
});

// New Series Detail sub-routes
const seriesDocumentsRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/series/$serieId/documents",
  component: SeriesDocuments,
});

const seriesDocumentDetailRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/series/$serieId/documents/$documentId",
  component: SeriesDocumentDetail,
});

const seriesStandingsRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/series/$serieId/standings",
  component: SeriesStandings,
});

const seriesCompetitionsRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/series/$serieId/competitions",
  component: SeriesCompetitions,
});

// Tour routes
const tourDetailRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/tours/$tourId",
  component: TourDetail,
});

const tourDocumentsRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/tours/$tourId/documents",
  component: TourDocuments,
});

const tourDocumentDetailRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/tours/$tourId/documents/$documentId",
  component: TourDocumentDetail,
});

const tourCompetitionsRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/tours/$tourId/competitions",
  component: TourCompetitions,
});

const tourStandingsRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/tours/$tourId/standings",
  component: TourStandings,
});

// Profile routes
const myProfileRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/profile",
  component: MyProfile,
});

const playerPublicProfileRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/players/$playerId",
  component: PlayerPublicProfile,
});

const competitionDetailRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/competitions/$competitionId",
  pendingComponent: LoadingSpinner,
  component: lazyRouteComponent(
    () => import("./views/player/CompetitionDetail")
  ),
});

const teeTimeDetailRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/competitions/$competitionId/tee-times/$teeTimeId",
  pendingComponent: LoadingSpinner,
  component: lazyRouteComponent(
    () => import("./views/player/CompetitionRound")
  ),
});

// Default redirect to player landing page
const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Navigate to="/player" replace />,
});

// Auth routes
const loginRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Login,
});

interface RegisterSearchParams {
  email?: string;
}

const registerRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/register",
  validateSearch: (search: Record<string, unknown>): RegisterSearchParams => {
    return {
      email: typeof search.email === "string" ? search.email : undefined,
    };
  },
  component: Register,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  adminRoute.addChildren([
    adminSeriesRoute,
    adminSeriesDetailRoute,
    adminTeamsRoute,
    adminCoursesRoute,
    adminCompetitionsRoute,
    adminCompetitionTeeTimesRoute,
    adminManualScoreEntryRoute,
    adminCompetitionGroupsRoute,
    adminPointTemplatesRoute,
    adminToursRoute,
    adminTourDetailRoute,
  ]),
  playerRoute.addChildren([
    playerLandingRoute,
    playerCompetitionsRoute,
    playerSeriesRoute,
    playerToursRoute,
    myProfileRoute,
    playerPublicProfileRoute,
    seriesDetailRoute,
    seriesDocumentsRoute,
    seriesDocumentDetailRoute,
    seriesStandingsRoute,
    seriesCompetitionsRoute,
    tourDetailRoute,
    tourDocumentsRoute,
    tourDocumentDetailRoute,
    tourCompetitionsRoute,
    tourStandingsRoute,
    competitionDetailRoute,
    teeTimeDetailRoute,
  ]),
]);

const router = createRouter({
  routeTree,
  basepath: getBasePath(),
});

export default router;
