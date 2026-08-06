import { useEffect, useRef } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import { CocktailDetailPage } from "../pages/CocktailDetailPage";
import { DiyWorkbenchPage } from "../pages/DiyWorkbenchPage";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { NotebookPage } from "../pages/NotebookPage";
import { PreviewRecipePage } from "../pages/PreviewRecipePage";
import { RecipeDetailPage } from "../pages/RecipeDetailPage";
import { RegisterPage } from "../pages/RegisterPage";
import { paths } from "./paths";

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
        <Routes location={location}>
          <Route path="/" element={<Navigate to={paths.home} replace />} />
          <Route path={paths.home} element={<HomePage />} />
          <Route path={paths.cocktailDetail} element={<CocktailDetailPage />} />
          <Route path={paths.diyWorkbench} element={<DiyWorkbenchPage />} />
          <Route path={paths.previewRecipe} element={<PreviewRecipePage />} />
          <Route path={paths.login} element={<LoginPage />} />
          <Route path={paths.register} element={<RegisterPage />} />
          <Route path={paths.recipeDetail} element={<RecipeDetailPage />} />
          <Route path={paths.notebook} element={<NotebookPage />} />
          <Route path="*" element={<Navigate to={paths.home} replace />} />
        </Routes>
      </div>
    </div>
  );
}
