import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { LogOut, User, LayoutDashboard, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function UserProfile({ user }) {
  const navigate = useNavigate();
  const { logout, isTeacher, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    await logout();
    navigate('/login');
  };

  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full w-9 h-9 bg-accent hover:bg-accent/80"
        >
          <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-accent-foreground">
            {initials}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium text-foreground">{user?.full_name || user?.email}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/profile")} className="text-xs">
          <User className="w-3.5 h-3.5 mr-2" />
          Profile
        </DropdownMenuItem>
        {isTeacher && (
          <DropdownMenuItem onClick={() => navigate("/org/dashboard")} className="text-xs">
            <LayoutDashboard className="w-3.5 h-3.5 mr-2" />
            Institution Dashboard
          </DropdownMenuItem>
        )}
        {!profile?.org_id && (
          <DropdownMenuItem onClick={() => navigate("/org/setup")} className="text-xs">
            <Building2 className="w-3.5 h-3.5 mr-2" />
            Set Up Institution
          </DropdownMenuItem>
        )}
        {user?.role === "admin" && (
          <DropdownMenuItem onClick={() => navigate("/admin")} className="text-xs">
            <User className="w-3.5 h-3.5 mr-2" />
            Admin Dashboard
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} disabled={isLoading} className="text-destructive focus:text-destructive">
          <LogOut className="w-3.5 h-3.5 mr-2" />
          {isLoading ? "Logging out..." : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
