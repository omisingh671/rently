import React from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/AppProviders";
import AppRouter from "@/routes/router";
import "@/index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </React.StrictMode>
);
