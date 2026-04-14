import React, { useState, useEffect, useRef, Component } from 'react';
import { io, Socket } from 'socket.io-client';
import { cn } from './lib/utils';
import { 
  Send, 
  Shield, 
  Copy,
  Check,
  LogOut,
  MessageSquare,
  Lock,
  Zap,
  Sparkles,
  User,
  Bot,
  Plus,
  History,
  Settings,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import geminiLogo from './assets/gemini-logo.svg';

// --- Types ---
interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName?: string;
  timestamp: string;
  isAI?: boolean;
}

// --- Error Boundary ---
interface ErrorBoundaryProps { children: React.ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: any; }
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#131314] text-[#e3e3e3] font-sans">
          <Shield className="w-12 h-12 text-red-500 mb-4" />
          <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#004a77] text-white rounded-lg text-sm font-medium">Reload App</button>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

// --- Gemini Fake UI Component ---
function GeminiFakeChat({ onExit }: { onExit: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hello! I\'m Gemini. How can I help you today?', senderId: 'ai', timestamp: new Date().toISOString(), isAI: true }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: Date.now().toString(), text: input, senderId: 'user', timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input })
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const aiMsg = { id: (Date.now() + 1).toString(), text: data.text, senderId: 'ai', timestamp: new Date().toISOString(), isAI: true };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Gemini Error:", error);
      const errorMsg = { 
        id: Date.now().toString(), 
        text: "Error: Could not connect to Gemini. Please check your internet connection or server logs.", 
        senderId: 'ai', 
        timestamp: new Date().toISOString(), 
        isAI: true 
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#131314] text-[#e3e3e3] font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:flex w-64 flex-col bg-[#1e1f20] p-4 space-y-4">
        <button className="flex items-center gap-3 px-4 py-3 bg-[#1a1b1c] rounded-full text-sm font-medium text-[#c4c7c5] hover:bg-[#28292a] transition-colors">
          <Plus className="w-5 h-5" />
          New chat
        </button>
        <div className="flex-1 overflow-y-auto space-y-2">
          <div className="text-xs font-bold text-[#c4c7c5] px-4 py-2 uppercase tracking-wider">Recent</div>
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#28292a] cursor-pointer text-sm truncate">
            <MessageSquare className="w-4 h-4" />
            Project ideas for 2024
          </div>
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#28292a] cursor-pointer text-sm truncate">
            <MessageSquare className="w-4 h-4" />
            How to bake a cake
          </div>
        </div>
        <div className="pt-4 border-t border-[#3c3d3e] space-y-1">
          <button className="flex items-center gap-3 w-full px-4 py-2 rounded-lg hover:bg-[#28292a] text-sm">
            <History className="w-4 h-4" /> History
          </button>
          <button className="flex items-center gap-3 w-full px-4 py-2 rounded-lg hover:bg-[#28292a] text-sm">
            <Settings className="w-4 h-4" /> Settings
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        <header className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Menu className="md:hidden w-6 h-6 text-[#c4c7c5]" />
            <h1 className="text-xl font-medium text-[#e3e3e3]">Gemini</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onExit} className="text-xs text-[#c4c7c5] hover:text-white transition-colors">Exit</button>
            <div className="w-8 h-8 bg-[#004a77] rounded-full flex items-center justify-center text-xs font-bold">M</div>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-20 py-8 space-y-10">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-4 md:gap-6", msg.isAI ? "items-start" : "items-start flex-row-reverse")}>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", msg.isAI ? "bg-transparent" : "bg-[#004a77]")}>
                {msg.isAI ? <Sparkles className="w-6 h-6 text-[#4285f4]" /> : <User className="w-5 h-5 text-white" />}
              </div>
              <div className="flex-1 space-y-2 max-w-3xl">
                <div className="text-[16px] leading-relaxed text-[#e3e3e3] whitespace-pre-wrap">
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-4 md:gap-6 items-start">
              <Sparkles className="w-6 h-6 text-[#4285f4] animate-pulse" />
              <div className="h-4 w-24 bg-[#1e1f20] rounded animate-pulse" />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 md:px-20 md:pb-10">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto relative">
            <div className="bg-[#1e1f20] rounded-3xl px-6 py-4 flex items-center gap-4 shadow-lg border border-[#3c3d3e] focus-within:border-[#4285f4] transition-all">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter a prompt here"
                className="flex-1 bg-transparent border-none outline-none text-[#e3e3e3] placeholder:text-[#8e918f]"
              />
              <div className="flex items-center gap-3 text-[#c4c7c5]">
                <Plus className="w-5 h-5 cursor-pointer hover:text-white" />
                <button type="submit" disabled={!input.trim() || isTyping}>
                  <Send className={cn("w-5 h-5 cursor-pointer hover:text-white", (!input.trim() || isTyping) && "opacity-30")} />
                </button>
              </div>
            </div>
            <p className="text-[11px] text-[#8e918f] text-center mt-3">
              Gemini may display inaccurate info, including about people, so double-check its responses.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

// --- Main App Component ---
function SleekChatApp() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [roomUsers, setRoomUsers] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Socket
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('receive-message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on('room-users', (users: string[]) => {
      setRoomUsers(users);
    });

    newSocket.on('user-typing', () => {
      setIsOtherTyping(true);
    });

    newSocket.on('user-stop-typing', () => {
      setIsOtherTyping(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Handle URL Hash for Room ID
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setRoomId(hash);
    }

    const handleHashChange = () => {
      const newHash = window.location.hash.replace('#', '');
      if (newHash) {
        setRoomId(newHash);
      } else {
        setRoomId(null);
        setIsJoined(false);
        setMessages([]);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Join Room when both roomId and username are ready
  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (socket && roomId && username.trim()) {
      socket.emit('join-room', { roomId, username });
      setIsJoined(true);
    }
  };

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const createRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 15);
    window.location.hash = newRoomId;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (socket && roomId) {
      socket.emit('typing', { roomId });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop-typing', { roomId });
      }, 2000);
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !roomId) return;

    socket.emit('send-message', {
      roomId,
      text: newMessage
    });
    socket.emit('stop-typing', { roomId });
    setNewMessage('');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exitChat = () => {
    window.location.hash = '';
  };

  return (
    <div className="flex flex-col h-screen bg-bg text-text-main font-sans overflow-hidden items-center justify-center p-4">
      <div className="w-full max-w-250 h-full max-h-180 bg-card border border-bubble-them rounded-2xl flex shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
        
        <AnimatePresence mode="wait">
          {!roomId ? (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8"
            >
              <div className="w-20 h-20 flex items-center justify-center">
                <img src={geminiLogo} alt="Gemini" className="w-full h-full object-contain" />
              </div>
              
              <div className="space-y-3">
                <h1 className="text-3xl font-bold tracking-tight text-text-main">Gemini</h1>
                <p className="text-text-muted max-w-xs mx-auto text-sm leading-relaxed">
                  Encrypted real-time chat. No messages are stored in any database. Once the page is closed, everything disappears.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
                <button 
                  onClick={createRoom}
                  className="w-full py-4 bg-accent text-white rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_8px_20_rgba(63,185,80,0.2)] flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Start ephemeral chat now
                </button>
                
                <div className="flex items-center gap-2 justify-center text-[10px] text-text-muted uppercase tracking-widest font-bold">
                  <Lock className="w-3 h-3" />
                  No database • Instant self-destruction
                </div>
              </div>
            </motion.div>
          ) : !isJoined ? (
            <motion.div 
              key="username-entry"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8"
            >
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-text-main">Enter your name</h2>
                <p className="text-text-muted text-sm">Choose a temporary name to join the chat.</p>
              </div>

              <form onSubmit={handleJoin} className="w-full max-w-xs space-y-4">
                <div className="bg-bg border border-bubble-them rounded-xl px-5 py-3.5 flex items-center focus-within:border-accent/50 transition-all shadow-inner">
                  <input 
                    type="text"
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your name..."
                    className="w-full bg-transparent border-none text-text-main outline-none text-[15px] placeholder:text-text-muted/30"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={!username.trim()}
                  className="w-full py-4 bg-accent text-white rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  Join Chat
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div 
              key="chat-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex h-full overflow-hidden"
            >
              {/* Sidebar */}
              <AnimatePresence>
                {showSidebar && (
                  <motion.div 
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 260, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="h-full bg-card border-r border-bubble-them flex flex-col overflow-hidden"
                  >
                    <div className="p-6 border-b border-bubble-them">
                      <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest">Users in Room</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      {roomUsers.map((user, idx) => (
                        <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/5">
                          <div className="w-2 h-2 bg-accent rounded-full" />
                          <span className="text-sm font-medium text-text-main truncate">{user}</span>
                          {user === username && <span className="text-[10px] text-text-muted ml-auto">(You)</span>}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main Chat Area */}
              <div className="flex-1 flex flex-col h-full min-w-0">
                {/* Chat Header */}
                <header className="flex items-center justify-between px-6 py-5 border-b border-bubble-them bg-card/50 backdrop-blur-sm">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                      <Menu className="w-5 h-5 text-text-muted" />
                    </button>
                    <div>
                      <h1 className="text-sm font-bold text-text-main uppercase tracking-wider">Ephemeral Chat</h1>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                        <span className="text-[10px] text-accent font-bold uppercase tracking-widest">Live Stream</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={copyLink}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all",
                        copied ? "bg-accent text-white" : "bg-white/5 text-text-muted hover:bg-white/10"
                      )}
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied" : "Copy Link"}
                    </button>
                  </div>
                </header>

                {/* Messages Area */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-6 space-y-6 bg-bg/20"
                >
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-text-muted space-y-4 opacity-40">
                      <Shield className="w-12 h-12" />
                      <div className="text-center space-y-1">
                        <p className="text-xs font-bold uppercase tracking-widest">Live stream only</p>
                        <p className="text-[11px] italic">Messages are not saved. Send the link to start.</p>
                      </div>
                    </div>
                  )}
                  
                  {messages.map((msg) => (
                    <div 
                      key={msg.id}
                      className={cn(
                        "max-w-[75%] flex flex-col gap-1.5",
                        msg.senderId === socket?.id ? "items-end ml-auto" : "items-start mr-auto"
                      )}
                    >
                      {msg.senderId !== socket?.id && (
                        <span className="text-[10px] font-bold text-accent px-1 uppercase tracking-wider">
                          {msg.senderName}
                        </span>
                      )}
                      <div 
                        className={cn(
                          "px-5 py-3 rounded-2xl text-[14px] leading-relaxed shadow-sm",
                          msg.senderId === socket?.id 
                            ? "bg-bubble-me text-white rounded-br-none" 
                            : "bg-bubble-them text-text-main rounded-bl-none border border-bubble-them"
                        )}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-text-muted px-1 font-medium">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}

                  {isOtherTyping && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-text-muted px-2"
                    >
                      <div className="flex gap-1">
                        <span className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Someone is typing...</span>
                    </motion.div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-6 bg-card border-t border-bubble-them">
                  <form onSubmit={sendMessage} className="flex gap-4 items-center">
                    <div className="flex-1 bg-bg border border-bubble-them rounded-xl px-5 py-3.5 flex items-center focus-within:border-accent/50 transition-all shadow-inner">
                      <input 
                        type="text"
                        value={newMessage}
                        onChange={handleInputChange}
                        placeholder="Type a real-time message here..."
                        className="w-full bg-transparent border-none text-text-main outline-none text-[15px] placeholder:text-text-muted/30"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="w-12.5 h-12.5 bg-accent text-white rounded-xl flex items-center justify-center disabled:opacity-30 disabled:scale-95 transition-all active:scale-90 shadow-[0_10px_20px_rgba(63,185,80,0.2)]"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                  <div className="mt-4 flex justify-center">
                    <span className="text-[10px] text-text-muted flex items-center gap-2 uppercase tracking-widest font-bold opacity-50">
                      <Lock className="w-3 h-3" />
                      No data storage (No Persistence)
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SleekChatApp />
    </ErrorBoundary>
  );
}
