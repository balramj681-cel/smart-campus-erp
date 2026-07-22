 import { Toaster } from "react-hot-toast";
 import Dashboard from "./pages/dashboard/Dashboard";
import AppRoutes from "./routes/AppRoutes";
/* import Login from "./pages/auth/Login";

export default function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Login />
    </>
  );
} 

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Dashboard />
    </>
  );
}

export default App;
*/


export default function App() {
  return (
    <>
      <Toaster position="top-right" />
      <AppRoutes />
    </>
  );
}