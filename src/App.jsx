import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/lib/AuthContext';
import PageNotFound from './lib/PageNotFound';
import CodeTutor from './pages/CodeTutor';
import AdminDashboard from './pages/AdminDashboard';
import UserProfile from './pages/UserProfile';
import Login from './pages/Login';
import OrgSetup from './pages/org/OrgSetup';
import OrgDashboard from './pages/org/OrgDashboard';
import OrgJoin from './pages/org/OrgJoin';

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<CodeTutor />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/admin" element={<AdminDashboard />} />
            {/* Institutional routes */}
            <Route path="/org/setup" element={<OrgSetup />} />
            <Route path="/org/dashboard" element={<OrgDashboard />} />
            <Route path="/org/join/:slug" element={<OrgJoin />} />
            <Route path="/org/join" element={<OrgJoin />} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
