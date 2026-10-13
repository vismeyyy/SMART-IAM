import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import CreateAccount from "./pages/CreateAccount";
import SignIn from "./pages/SignIn";
import SecurityLogin from "./pages/SecurityLogin";
import RootUserLogin from "./pages/RootUserLogin";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/security/login" replace />} />
        <Route path="/create-account" element={<CreateAccount />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/security/login" element={<SecurityLogin />} />
        <Route path="/security/portal" element={<SecurityLogin portal />} />
        <Route path="/root/login" element={<RootUserLogin />} />
        <Route path="/root/portal" element={<RootUserLogin portal />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;