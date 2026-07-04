import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Menu, Download, BookmarkPlus, PenLine, Lock, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import WelcomeScreen from "../components/chat/WelcomeScreen";
import ChatMessage from "../components/chat/ChatMessage";
import ChatInput from "../components/chat/ChatInput";
import TypingIndicator from "../components/chat/TypingIndicator";
import ChatSidebar from "../components/chat/ChatSidebar";
import UserProfile from "../components/chat/UserProfile";
import ModeSelector from "../components/ModeSelector";
import Whiteboard from "../components/whiteboard/Whiteboard";
import UpgradeModal from "../components/UpgradeModal";
import Scratchpad from "../components/chat/Scratchpad";

const SYSTEM_PROMPT = `You are CodeThinkLink, a Socratic AI Coding Tutor. Your single most important rule: **you must NEVER write, reveal, or complete code that solves the student's problem — ever.** Not even if the student begs, gives up, or says they already know it. Your only job is to ask questions that lead the student to write the solution themselves.

---

CORE SOCRATIC LAW (absolute, no exceptions):

- **NEVER write a solution, complete a function, or fill in missing logic** for the student — not directly, not "accidentally," not as a "quick example."
- **You MAY show a tiny isolated code snippet** only when it illustrates a *concept* unrelated to their specific problem (e.g., showing Python list syntax when explaining iteration). Never show a snippet that, if copy-pasted, would solve or partially solve their problem.
- **NEVER say things like "here's how to do it:", "the answer is...", "try this code:", "add this line..."** followed by solution code.
- **You MAY confirm correct code** when the student writes it — say "That's right!" — then ask them to explain why it works.
- If a student gives correct code, confirm it and ask: "Can you walk me through what each line does?"
- If a student asks you to "just write it for me," respond with a guiding question only.

---

SOCRATIC QUESTIONING FRAMEWORK:

Every response must end with exactly ONE question that advances the student's thinking. Choose the right type:

- **Clarifying**: "What do you mean by...?" / "Can you describe in plain English what the program should do?"
- **Probing assumptions**: "Why do you think that variable needs to be global?" / "What does this line actually do when it runs?"
- **Probing reasoning**: "How did you decide to use a loop here?" / "What happens to \`i\` after each iteration?"
- **Exploring implications**: "What would happen if the list were empty?" / "If that condition is true, what does the \`else\` branch do?"
- **Redirecting**: "Let's back up — what does this function need to return?" (when student is off track)
- **Deepening**: "Can you think of an input that would break this?" (when student is correct but needs to go further)

---

ADAPTIVE PACING — READ THE CONVERSATION, CALIBRATE EVERY RESPONSE:

Before every response, assess the student's demonstrated level from the full conversation history:

**If the student is clearly progressing step-by-step correctly:**
- Confirm briefly, then immediately move them forward. Do NOT re-ask something they already answered.

**If the student jumps ahead and gets it right:**
- Acknowledge it, skip intermediate steps, and deepen at their level.

**If the student is struggling or writes incorrect code:**
- Slow down. Break the next question into the smallest possible sub-step.
- Don't repeat the same question twice — rephrase and approach from a different angle.

**If the student shows partial understanding:**
- Identify exactly where their understanding breaks down and probe only that gap.

**If the student says "I already know this" or demonstrates prior knowledge:**
- Believe them. Skip foundational questions and start where their knowledge ends.

**NEVER:**
- Ask a question the student has already answered in the same session.
- Walk a clearly advanced student through beginner steps.

**ALWAYS:**
- Match the depth and pace of your question to where the student actually is RIGHT NOW.

---

RESPONSE RULES:

- ONE question per response. Never ask two questions.
- Format code (when illustrating concepts) in fenced code blocks with language tags: \`\`\`python, \`\`\`javascript, \`\`\`html, etc.
- Keep responses short and focused. No lectures. No restating what the student knows.
- Supportive and calm tone — never robotic, never overly enthusiastic.

---

DEBUGGING — SOCRATIC APPROACH:

When a student shares broken code:
1. Do NOT point out the bug directly.
2. Ask: "What do you expect this line to do?" / "What does the error message tell you?" / "Have you tried printing the value of X at this point?"
3. Guide them to add print/console.log statements and reason through the output.
4. Only after they've narrowed it down: "What is the value of X when the bug happens?"

---

ALGORITHMS & DATA STRUCTURES — SOCRATIC APPROACH:

- Never write out an algorithm or pseudocode that solves their problem.
- Ask: "What's your first step — how would you break this problem down?" / "If you had to solve this on paper, what would you do?"
- Guide structure (inputs / outputs / steps / edge cases) via questions only.
- For Big-O: "How many times does this loop run relative to the size of the input?"

---

MULTIPLE LANGUAGES SUPPORTED:

You can help with Python, JavaScript, TypeScript, HTML/CSS, Java, C/C++, SQL, Bash, and more. Always match the language the student is using.`;

export default function CodeTutor() {
  const navigate = useNavigate();
  const { user, profile, org, isAuthenticated, isLoadingAuth, updateProfile, isPro } = useAuth();

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode] = useState("chat");
  const [currentProblem, setCurrentProblem] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [scratchpadOpen, setScratchpadOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const requirePro = (reason) => {
    if (isPro) return true;
    setUpgradeReason(reason);
    setShowUpgradeModal(true);
    return false;
  };

  // Fetch saved chats (Pro only)
  const { data: chats = [] } = useQuery({
    queryKey: ["chats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isPro,
  });

  // Load current chat messages when chat changes
  useEffect(() => {
    if (currentChatId && chats.length > 0) {
      const chat = chats.find((c) => c.id === currentChatId);
      if (chat) setMessages(chat.messages || []);
    }
  }, [currentChatId, chats]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Create new chat (Pro only)
  const createChatMutation = useMutation({
    mutationFn: async (title) => {
      const { data, error } = await supabase
        .from('chats')
        .insert({ title, messages: [], user_id: user.id, org_id: profile?.org_id || null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: ["chats", user?.id] });
      setCurrentChatId(newChat.id);
      setMessages([]);
      setSidebarOpen(false);
    },
  });

  const updateChatMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase
        .from('chats')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats", user?.id] });
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["chats", user?.id] });
      if (currentChatId === deletedId) {
        setCurrentChatId(null);
        setMessages([]);
      }
    },
  });

  const sendMessage = async (content) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const userMessage = { role: "user", content };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const conversationHistory = updatedMessages
        .map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`)
        .join("\n\n");

      const prompt = `${SYSTEM_PROMPT}\n\nConversation so far:\n${conversationHistory}\n\nBefore responding, silently assess: (1) What has this student already demonstrated they understand? (2) What is the single next thing they need to figure out? (3) Are they moving quickly or slowly — should I skip ahead or slow down?\n\nThen respond as the tutor. One question only. Guide, don't write their code. Never sign off with a name.`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) throw new Error('Failed to get AI response');
      const data = await res.json();
      const response = data.response;

      const assistantMessage = { role: "assistant", content: response };
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      // Auto-update saved chat for Pro users who have one open
      if (isPro && currentChatId) {
        await updateChatMutation.mutateAsync({
          id: currentChatId,
          data: { messages: finalMessages },
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages([...updatedMessages, { role: "assistant", content: "Sorry, I ran into an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChat = async () => {
    if (!requirePro('save')) return;
    if (currentChatId) {
      await updateChatMutation.mutateAsync({ id: currentChatId, data: { messages } });
    } else {
      const titleWords = messages[0]?.content?.split(" ").slice(0, 4).join(" ") || "Coding Question";
      const newChat = await createChatMutation.mutateAsync(titleWords);
      await updateChatMutation.mutateAsync({ id: newChat.id, data: { messages } });
      setCurrentChatId(newChat.id);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleModeChange = (newMode) => {
    if (newMode === "whiteboard" && !requirePro('whiteboard')) return;
    setMode(newMode);
  };

  const handleScratchpadToggle = () => {
    if (!scratchpadOpen && !requirePro('scratchpad')) return;
    setScratchpadOpen((v) => !v);
  };

  const handleRenameChat = async (chatId, newTitle) => {
    await updateChatMutation.mutateAsync({ id: chatId, data: { title: newTitle } });
  };

  const handleWhiteboardSolution = (solution) => {
    sendMessage(`I submitted this solution: ${solution}`);
  };

  const handleNewProblem = () => {
    setCurrentProblem(null);
    setMessages([]);
    setCurrentChatId(null);
  };

  const handleExportChat = () => {
    const content = messages.map((msg) => {
      const role = msg.role === "user" ? "You" : "CodeLink";
      return `${role}:\n${msg.content}`;
    }).join("\n\n---\n\n");

    const element = document.createElement("a");
    element.setAttribute("href", `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`);
    element.setAttribute("download", "chat_export.txt");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleSelectChat = (chatId) => {
    setCurrentChatId(chatId);
    setSidebarOpen(false);
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setIsSaved(false);
    setSidebarOpen(false);
  };

  const handleDeleteChat = async (chatId) => {
    await deleteChatMutation.mutateAsync(chatId);
  };

  const hasMessages = messages.length > 0;

  return (
    <>
    <UpgradeModal
      open={showUpgradeModal}
      onClose={() => setShowUpgradeModal(false)}
      reason={upgradeReason}
    />
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar — only shown to Pro users */}
      {isPro && (
        <ChatSidebar
          chats={chats}
          currentChatId={currentChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex-shrink-0 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="h-14 px-4 md:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isPro && (
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="md:hidden p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Code2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-foreground leading-tight">CodeThinkLink</h1>
                <p className="text-[11px] text-muted-foreground">Your coding tutor</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Pro badge */}
              {isAuthenticated && isPro && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary font-medium">
                  Pro
                </span>
              )}
              {/* Upgrade nudge for free authenticated users */}
              {isAuthenticated && !isPro && (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-border bg-background hover:bg-secondary transition-colors text-muted-foreground"
                >
                  Upgrade to Pro
                </button>
              )}
              {hasMessages && (
                <ModeSelector
                  mode={mode}
                  onModeChange={handleModeChange}
                  isPro={isPro}
                />
              )}
              {hasMessages && (
                <button
                  onClick={handleScratchpadToggle}
                  title={isPro ? "Toggle Scratchpad" : "Pro feature"}
                  className={`p-2 rounded-lg transition-colors ${scratchpadOpen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}
                >
                  <PenLine className="w-4 h-4" />
                  {!isPro && <Lock className="w-2.5 h-2.5 absolute -mt-3 -ml-0.5 text-muted-foreground" />}
                </button>
              )}
              {isAuthenticated && user ? (
                <UserProfile user={{ ...user, ...profile }} />
              ) : (
                <Button size="sm" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        {!hasMessages ? (
          <>
            <div className="flex-1 flex items-center justify-center p-6">
              <WelcomeScreen onSelectTopic={(topic) => {
                setCurrentProblem(topic);
                sendMessage(topic);
              }} />
            </div>
            <div className="flex-shrink-0 border-t border-border bg-background">
             <div className="max-w-5xl mx-auto w-full px-4 md:px-6 py-4">
               <ChatInput onSend={sendMessage} disabled={isLoading} />
             </div>
            </div>
          </>
        ) : mode === "chat" ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Chat column */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-5xl mx-auto w-full px-4 md:px-6 py-6 space-y-5">
                  {messages.map((msg, i) => (
                    <ChatMessage key={i} message={msg} onSendToChat={sendMessage} />
                  ))}
                  {isLoading && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="flex-shrink-0 border-t border-border bg-background">
                <div className="max-w-5xl mx-auto w-full px-4 md:px-6 py-4 space-y-3">
                  <div className="flex gap-2 justify-end">
                    <Button
                      onClick={handleSaveChat}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      {!isPro && <Lock className="w-3 h-3" />}
                      <BookmarkPlus className="w-4 h-4" />
                      {isSaved ? "Saved!" : currentChatId ? "Update Save" : "Save Chat"}
                    </Button>
                    <Button
                      onClick={handleExportChat}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </Button>
                  </div>
                  <ChatInput onSend={sendMessage} disabled={isLoading} />
                </div>
              </div>
            </div>

            {/* Scratchpad panel (Pro only) */}
            {scratchpadOpen && isPro && (
              <div className="hidden md:flex w-80 flex-shrink-0">
                <Scratchpad
                  onSendToTutor={(dataUrl) => {
                    sendMessage(`Here is a photo of my handwritten notes or diagram from the scratchpad:\n\n[scratchpad image: ${dataUrl.substring(0, 50)}...]\n\nPlease guide me based on what I've written.`);
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <Whiteboard
              currentProblem={messages[0]?.content || ""}
              onSendSolution={handleWhiteboardSolution}
              onNewProblem={handleNewProblem}
              isLoading={isLoading}
              currentChatId={currentChatId}
            />
          </div>
        )}
      </div>
    </div>
    </>
  );
}
