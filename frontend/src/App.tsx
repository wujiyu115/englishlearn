// frontend/src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Words from "./pages/Words";
import Game from "./pages/Game";
import Scenes from "./pages/Scenes";
import ArticleList from "./pages/Reading/index";
import Reader from "./pages/Reading/Reader";
import League from "./pages/League";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/words" element={<Words />} />
        <Route path="/game" element={<Game />} />
        <Route path="/scenes" element={<Scenes />} />
        <Route path="/reading" element={<ArticleList />} />
        <Route path="/reading/:id" element={<Reader />} />
        <Route path="/league" element={<League />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
