import { lazy, Suspense, useEffect, useRef } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import { paths } from "./paths";

const CocktailDetailPage = lazy(() =>
  import("../pages/CocktailDetailPage").then((module) => ({
    default: module.CocktailDetailPage,
  })),
);
const DiyWorkbenchPage = lazy(() =>
  import("../pages/DiyWorkbenchPage").then((module) => ({
    default: module.DiyWorkbenchPage,
  })),
);
const HomePage = lazy(() =>
  import("../pages/HomePage").then((module) => ({
    default: module.HomePage,
  })),
);
const LoginPage = lazy(() =>
  import("../pages/LoginPage").then((module) => ({
    default: module.LoginPage,
  })),
);
const NotebookPage = lazy(() =>
  import("../pages/NotebookPage").then((module) => ({
    default: module.NotebookPage,
  })),
);
const PreviewRecipePage = lazy(() =>
  import("../pages/PreviewRecipePage").then((module) => ({
    default: module.PreviewRecipePage,
  })),
);
const RecipeDetailPage = lazy(() =>
  import("../pages/RecipeDetailPage").then((module) => ({
    default: module.RecipeDetailPage,
  })),
);
const RegisterPage = lazy(() =>
  import("../pages/RegisterPage").then((module) => ({
    default: module.RegisterPage,
  })),
);

export function AppRouter() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const hasRendered = useRef(false);
  const turnDirection =
    navigationType === "POP" && hasRendered.current ? "back" : "forward";

  useEffect(() => {
    hasRendered.current = true;
  }, []);

  return (
    <div className="book-stage" data-turn-direction={turnDirection}>
      <div className="book-page-transition" key={location.key}>
        <Suspense fallback={null}>
          <Routes location={location}>
            <Route path="/" element={<Navigate to={paths.home} replace />} />
            <Route path={paths.home} element={<HomePage />} />
            <Route
              path={paths.cocktailDetail}
              element={<CocktailDetailPage />}
            />
            <Route path={paths.diyWorkbench} element={<DiyWorkbenchPage />} />
            <Route path={paths.previewRecipe} element={<PreviewRecipePage />} />
            <Route path={paths.login} element={<LoginPage />} />
            <Route path={paths.register} element={<RegisterPage />} />
            <Route path={paths.recipeDetail} element={<RecipeDetailPage />} />
            <Route path={paths.notebook} element={<NotebookPage />} />
            <Route path="*" element={<Navigate to={paths.home} replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}
