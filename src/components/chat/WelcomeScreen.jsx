import React from "react";
import { motion } from "framer-motion";
import { Terminal, Code2, GitBranch, Bug } from "lucide-react";

const topics = [
  { icon: Terminal, label: "Python", prompt: "I need help understanding loops and functions in Python" },
  { icon: Code2, label: "JavaScript", prompt: "Can you help me learn about promises and async/await?" },
  { icon: GitBranch, label: "Algorithms", prompt: "I'm struggling to understand recursion" },
  { icon: Bug, label: "Debugging", prompt: "Help me figure out why my code isn't working" },
];

export default function WelcomeScreen({ onSelectTopic }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-lg w-full text-center"
      >
        <div className="mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center"
          >
            <Code2 className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-3">
            CodeThinkLink
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-md mx-auto">
            Your personal coding tutor. I won't write your code — I'll help you <em className="text-foreground font-medium">think</em> through it yourself.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {topics.map((topic, i) => (
            <motion.button
              key={topic.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              onClick={() => onSelectTopic(topic.prompt)}
              className="group p-4 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/20 transition-colors text-left"
            >
              <topic.icon className="w-5 h-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-sm text-foreground">{topic.label}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{topic.prompt}</p>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}