import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, MessageCircle, X, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function ChatSidebar({ chats, currentChatId, onSelectChat, onNewChat, onDeleteChat, onRenameChat, isOpen, onToggle }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef(null);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const startRename = (e, chat) => {
    e.stopPropagation();
    setRenamingId(chat.id);
    setRenameValue(chat.title);
  };

  const commitRename = (chatId) => {
    if (renameValue.trim()) onRenameChat(chatId, renameValue.trim());
    setRenamingId(null);
  };

  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Saved Chats</h2>
          <button onClick={onToggle} className="md:hidden p-1 rounded hover:bg-secondary">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <Button
          onClick={onNewChat}
          className="w-full gap-2 rounded-lg bg-primary hover:bg-primary/90"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-1">
          {chats.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No saved chats yet</p>
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                onMouseEnter={() => setHoveredId(chat.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => renamingId !== chat.id && onSelectChat(chat.id)}
                className={`w-full text-left p-3 rounded-lg cursor-pointer transition-colors group relative ${
                  currentChatId === chat.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-secondary border border-transparent"
                }`}
              >
                {renamingId === chat.id ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(chat.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onBlur={() => commitRename(chat.id)}
                      className="flex-1 text-sm bg-transparent border-b border-primary outline-none text-foreground"
                    />
                    <button onClick={() => commitRename(chat.id)} className="text-primary">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground truncate pr-12">{chat.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {format(new Date(chat.updated_date), "MMM d, h:mm a")}
                    </p>
                  </>
                )}

                <AnimatePresence>
                  {hoveredId === chat.id && renamingId !== chat.id && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5"
                    >
                      <button
                        onClick={(e) => startRename(e, chat)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden md:flex w-60 flex-shrink-0 bg-card border-r border-border flex-col">
        <SidebarContent />
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="md:hidden fixed inset-y-0 left-0 w-64 bg-card border-r border-border flex flex-col z-50"
            >
              <SidebarContent />
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onToggle}
              className="md:hidden fixed inset-0 bg-black/20 z-40"
            />
          </>
        )}
      </AnimatePresence>
    </>
  );
}