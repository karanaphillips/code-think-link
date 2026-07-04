import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Users, MessageSquare, Clock, TrendingUp,
  Copy, Check, Mail, BookOpen, CreditCard
} from "lucide-react";

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StudentDetailModal({ student, open, onClose }) {
  const { data: chats = [], isLoading } = useQuery({
    queryKey: ["student-chats", student?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chats")
        .select("id, title, messages, created_at, updated_at")
        .eq("user_id", student.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!student && open,
  });

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{student.full_name || student.email}</DialogTitle>
          <DialogDescription>{student.email} · {student.org_role}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
            </div>
          ) : chats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No saved sessions yet.</p>
          ) : (
            chats.map(chat => (
              <div key={chat.id} className="p-3 border border-border rounded-lg hover:bg-accent/30 transition">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{chat.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {chat.messages?.length || 0} messages · Last active {new Date(chat.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {chat.messages?.length || 0} msgs
                  </Badge>
                </div>
                {chat.messages?.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2 italic">
                    "{chat.messages[0]?.content?.slice(0, 100)}..."
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InvitePanel({ org, orgId }) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState("student");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const joinLink = `${window.location.origin}/org/join/${org?.slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(joinLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleInvite = async () => {
    const emailList = emails.split(/[\n,]/).map(e => e.trim()).filter(Boolean);
    if (!emailList.length) return;
    setIsInviting(true);
    setInviteResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/org/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ emails: emailList, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInviteResult(data.results);
      setEmails("");
      queryClient.invalidateQueries(["org-members", orgId]);
    } catch (err) {
      setInviteResult([{ status: "error", message: err.message }]);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Self-join link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Share Join Link</CardTitle>
          <CardDescription>Anyone with this link can join as a student (no invite email needed).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input readOnly value={joinLink} className="text-xs font-mono" />
            <Button variant="outline" size="icon" onClick={copyLink}>
              {copiedLink ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email invites */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email Invitations</CardTitle>
          <CardDescription>Invited users get a sign-up email with a direct link to your org.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Email addresses</label>
            <textarea
              className="w-full min-h-[80px] text-sm border border-border rounded-md px-3 py-2 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="one@school.edu&#10;two@school.edu&#10;Or paste a comma-separated list"
              value={emails}
              onChange={e => setEmails(e.target.value)}
            />
          </div>
          {profile?.org_role === "admin" && (
            <div>
              <label className="text-sm font-medium mb-1 block">Role</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={handleInvite} disabled={isInviting || !emails.trim()} className="gap-2">
            <Mail className="w-4 h-4" />
            {isInviting ? "Sending..." : "Send Invitations"}
          </Button>
          {inviteResult && (
            <div className="space-y-1 text-xs">
              {inviteResult.map((r, i) => (
                <p key={i} className={r.status === "error" ? "text-destructive" : "text-green-600"}>
                  {r.email ? `${r.email}: ` : ""}{r.status === "invited" ? "Invited" : r.message}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrgDashboard() {
  const navigate = useNavigate();
  const { profile, org, isAuthenticated, isLoadingAuth, isTeacher, isOrgAdmin } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  React.useEffect(() => {
    if (!isLoadingAuth) {
      if (!isAuthenticated) navigate("/login");
      else if (!profile?.org_id) navigate("/org/setup");
      else if (!isTeacher) navigate("/");
    }
  }, [isAuthenticated, isLoadingAuth, profile, isTeacher, navigate]);

  // Fetch all org members
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["org-members", profile?.org_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, org_role, created_at")
        .eq("org_id", profile.org_id)
        .order("org_role")
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.org_id,
  });

  // Fetch session stats per student
  const { data: chatStats = {} } = useQuery({
    queryKey: ["org-chat-stats", profile?.org_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chats")
        .select("user_id, updated_at")
        .eq("org_id", profile.org_id);
      if (error) throw error;
      const stats = {};
      for (const chat of data) {
        if (!stats[chat.user_id]) stats[chat.user_id] = { count: 0, lastActive: null };
        stats[chat.user_id].count += 1;
        const d = new Date(chat.updated_at);
        if (!stats[chat.user_id].lastActive || d > new Date(stats[chat.user_id].lastActive)) {
          stats[chat.user_id].lastActive = chat.updated_at;
        }
      }
      return stats;
    },
    enabled: !!profile?.org_id,
  });

  const students = members.filter(m => m.org_role === "student");
  const staff = members.filter(m => m.org_role !== "student");

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const activeThisWeek = students.filter(s => {
    const last = chatStats[s.id]?.lastActive;
    return last && new Date(last) > sevenDaysAgo;
  }).length;

  const totalSessions = Object.values(chatStats).reduce((sum, s) => sum + s.count, 0);
  const seatsUsed = students.length;
  const seatsPurchased = org?.seats_purchased || 0;

  const filteredStudents = students.filter(s =>
    !searchQuery ||
    s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoadingAuth || membersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <StudentDetailModal
        student={selectedStudent}
        open={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/")} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{org?.name}</p>
                <p className="text-[11px] text-muted-foreground capitalize">{profile?.org_role} Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOrgAdmin && seatsPurchased === 0 && (
                <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={() => navigate("/org/setup")}>
                  <CreditCard className="w-3.5 h-3.5" />
                  Set Up Billing
                </Button>
              )}
              <Button size="sm" onClick={() => navigate("/")} className="text-xs">
                Open Tutor
              </Button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
          <Tabs defaultValue="overview">
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="students">Students ({students.length})</TabsTrigger>
              {isOrgAdmin && <TabsTrigger value="invite">Invite</TabsTrigger>}
              {isOrgAdmin && <TabsTrigger value="settings">Settings</TabsTrigger>}
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Total Students" value={seatsUsed}
                  sub={seatsPurchased > 0 ? `${seatsPurchased - seatsUsed} seats remaining` : "No billing set up"} />
                <StatCard icon={TrendingUp} label="Active This Week" value={activeThisWeek}
                  sub={seatsUsed > 0 ? `${Math.round(activeThisWeek / seatsUsed * 100)}% of students` : undefined} />
                <StatCard icon={MessageSquare} label="Total Sessions" value={totalSessions}
                  sub="Saved chat sessions" />
                <StatCard icon={Clock} label="Staff Members" value={staff.length}
                  sub={`${staff.filter(s => s.org_role === "teacher").length} teachers, ${staff.filter(s => s.org_role === "admin").length} admins`} />
              </div>

              {/* Recent activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recently Active Students</CardTitle>
                </CardHeader>
                <CardContent>
                  {students.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No students yet — invite them from the Invite tab.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {students
                        .filter(s => chatStats[s.id])
                        .sort((a, b) => {
                          const aDate = chatStats[a.id]?.lastActive || "";
                          const bDate = chatStats[b.id]?.lastActive || "";
                          return bDate.localeCompare(aDate);
                        })
                        .slice(0, 8)
                        .map(student => (
                          <button
                            key={student.id}
                            onClick={() => setSelectedStudent(student)}
                            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent/40 transition text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                                {(student.full_name || student.email)?.[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{student.full_name || student.email}</p>
                                <p className="text-xs text-muted-foreground">{student.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-medium text-foreground">{chatStats[student.id]?.count || 0} sessions</p>
                              {chatStats[student.id]?.lastActive && (
                                <p className="text-xs text-muted-foreground">
                                  {new Date(chatStats[student.id].lastActive).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Students */}
            <TabsContent value="students" className="space-y-4">
              <Input
                placeholder="Search students by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              <Card>
                <CardContent className="pt-4">
                  {filteredStudents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {searchQuery ? "No students match your search." : "No students yet."}
                    </p>
                  ) : (
                    <div className="divide-y divide-border">
                      {filteredStudents.map(student => (
                        <button
                          key={student.id}
                          onClick={() => setSelectedStudent(student)}
                          className="w-full flex items-center justify-between py-3 hover:bg-accent/20 px-2 rounded-lg transition text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                              {(student.full_name || student.email)?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{student.full_name || "(no name)"}</p>
                              <p className="text-xs text-muted-foreground">{student.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-right">
                            <div>
                              <p className="text-xs font-medium">{chatStats[student.id]?.count || 0} sessions</p>
                              <p className="text-xs text-muted-foreground">
                                {chatStats[student.id]?.lastActive
                                  ? new Date(chatStats[student.id].lastActive).toLocaleDateString()
                                  : "Never active"}
                              </p>
                            </div>
                            <div className={`w-2 h-2 rounded-full ${
                              chatStats[student.id]?.lastActive && new Date(chatStats[student.id].lastActive) > sevenDaysAgo
                                ? "bg-green-500"
                                : "bg-slate-300"
                            }`} />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Staff section */}
              {staff.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Staff</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-border">
                      {staff.map(member => (
                        <div key={member.id} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                              {(member.full_name || member.email)?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{member.full_name || "(no name)"}</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="capitalize text-xs">{member.org_role}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Invite */}
            {isOrgAdmin && (
              <TabsContent value="invite">
                <InvitePanel org={org} orgId={profile?.org_id} />
              </TabsContent>
            )}

            {/* Settings */}
            {isOrgAdmin && (
              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Billing & Seats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Seats purchased</span>
                      <span className="font-medium">{seatsPurchased || "Not set up"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Seats used</span>
                      <span className="font-medium">{seatsUsed}</span>
                    </div>
                    {seatsPurchased > 0 && (
                      <div className="w-full bg-border rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${Math.min(100, (seatsUsed / seatsPurchased) * 100)}%` }}
                        />
                      </div>
                    )}
                    <Button variant="outline" className="w-full gap-2" onClick={() => navigate("/org/setup")}>
                      <CreditCard className="w-4 h-4" />
                      {seatsPurchased > 0 ? "Manage Billing" : "Set Up Billing"}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Organization Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{org?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Join link slug</span>
                      <span className="font-mono text-xs">{org?.slug}</span>
                    </div>
                    {org?.domain && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Domain</span>
                        <span className="font-mono text-xs">{org.domain}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </>
  );
}
