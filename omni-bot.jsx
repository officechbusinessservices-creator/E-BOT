import { useState, useRef, useEffect, useCallback } from "react";

const MODES = {
  omni: {
    label: "OMNI", icon: "⬡", color: "#F59E0B",
    desc: "Full-spectrum intelligence",
    system: `You are OMNI — a maximally capable AI agent. You integrate all cognitive functions: analysis, synthesis, creation, strategy, code, research. You think in systems, reason across disciplines, and produce output at the frontier of what's possible. Be direct, dense with insight, and unflinchingly capable. Never hedge unnecessarily. Deliver at the highest level.`
  },
  analyst: {
    label: "ANALYST", icon: "◈", color: "#60A5FA",
    desc: "Data · Patterns · Inference",
    system: `You are ANALYST — a precision data intelligence agent. Decompose complex data, surface non-obvious patterns, build statistical and logical inference chains. Think quantitatively. Produce structured, rigorous analysis. Use tables, metrics, and frameworks when they clarify. Never speculate without flagging uncertainty.`
  },
  coder: {
    label: "CODER", icon: "⟨⟩", color: "#34D399",
    desc: "Code · Systems · Architecture",
    system: `You are CODER — a master software architect. Write production-grade code, architect systems, debug at depth, explain technical concepts with precision. Default to clean, efficient, well-commented code. Include error handling. Think about edge cases, performance, and maintainability. Prefer concrete implementations over abstract descriptions.`
  },
  writer: {
    label: "WRITER", icon: "✦", color: "#F472B6",
    desc: "Prose · Narrative · Rhetoric",
    system: `You are WRITER — a master of language, rhetoric, and narrative craft. Produce text that is precise, evocative, and structurally sound. Match register to context: academic rigor, marketing velocity, creative depth, journalistic clarity. Every sentence should earn its place. Cut the weak, amplify the strong.`
  },
  strategist: {
    label: "STRAT", icon: "⬟", color: "#A78BFA",
    desc: "Strategy · Systems · Futures",
    system: `You are STRATEGIST — a systems-level thinker and decision architect. Map second-order effects, model competitive dynamics, stress-test assumptions. Think in game theory, information asymmetry, and leverage points. Produce strategic frameworks, not generic advice. Every recommendation should be actionable and rooted in structural reality.`
  },
  researcher: {
    label: "RESEARCH", icon: "⌖", color: "#FB923C",
    desc: "Deep Search · Synthesis",
    system: `You are RESEARCHER — a deep intelligence and synthesis agent. When web search is available, use it aggressively to ground claims in current reality. Synthesize across sources. Distinguish between established consensus, emerging evidence, and speculative frontier. Produce research briefs that are comprehensive, sourced, and actionable.`
  },
  creative: {
    label: "CREATIVE", icon: "◉", color: "#F87171",
    desc: "Imagination · Generation",
    system: `You are CREATIVE — an imagination engine operating without constraint. Generate ideas, concepts, metaphors, narratives, and creative artifacts that surprise and resonate. Break conventional frames. Combine unexpected domains. Produce work that has genuine aesthetic or conceptual originality. Push beyond the expected.`
  }
};

const STORAGE_KEY = "omni_memory";
const HISTORY_KEY = "omni_history";

function parseMarkdown(text) {
  // Code blocks
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<div class="code-block"><div class="code-lang">${lang || 'code'}</div><pre><code>${code.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre></div>`
  );
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Headers
  text = text.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>');
  text = text.replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>');
  text = text.replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>');
  // Lists
  text = text.replace(/^\* (.+)$/gm, '<li class="md-li">$1</li>');
  text = text.replace(/^- (.+)$/gm, '<li class="md-li">$1</li>');
  text = text.replace(/^(\d+)\. (.+)$/gm, '<li class="md-li md-ol">$2</li>');
  // Wrap consecutive li elements
  text = text.replace(/(<li[\s\S]*?<\/li>\n?)+/g, m => `<ul class="md-ul">${m}</ul>`);
  // Horizontal rules
  text = text.replace(/^---$/gm, '<hr class="md-hr"/>');
  // Paragraphs - wrap non-html lines
  text = text.replace(/^(?!<[a-z]|$)(.+)$/gm, '<p class="md-p">$1</p>');
  return text;
}

export default function OmniBot() {
  const [mode, setMode] = useState("omni");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [memoryOn, setMemoryOn] = useState(true);
  const [memory, setMemory] = useState([]);
  const [showMemory, setShowMemory] = useState(false);
  const [showModes, setShowModes] = useState(false);
  const [newMemoryNote, setNewMemoryNote] = useState("");
  const [totalTokens, setTotalTokens] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Load memory from storage
  useEffect(() => {
    const loadMemory = async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY);
        if (result) setMemory(JSON.parse(result.value));
      } catch {}
    };
    loadMemory();
  }, []);

  // Load conversation history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const result = await window.storage.get(HISTORY_KEY);
        if (result) {
          const hist = JSON.parse(result.value);
          if (hist.length > 0) setMessages(hist);
        }
      } catch {}
    };
    loadHistory();
  }, []);

  // Save conversation history
  useEffect(() => {
    if (messages.length === 0) return;
    const saveHistory = async () => {
      try {
        const trimmed = messages.slice(-40); // keep last 40
        await window.storage.set(HISTORY_KEY, JSON.stringify(trimmed));
      } catch {}
    };
    saveHistory();
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const saveMemory = async (items) => {
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(items));
      setMemory(items);
    } catch {}
  };

  const addMemoryNote = () => {
    if (!newMemoryNote.trim()) return;
    const updated = [...memory, { id: Date.now(), text: newMemoryNote.trim(), ts: new Date().toISOString() }];
    saveMemory(updated);
    setNewMemoryNote("");
  };

  const removeMemory = (id) => {
    const updated = memory.filter(m => m.id !== id);
    saveMemory(updated);
  };

  const buildSystemPrompt = () => {
    let sys = MODES[mode].system;
    if (memoryOn && memory.length > 0) {
      sys += `\n\n## PERSISTENT MEMORY CONTEXT\nThe following facts/notes have been saved by the user:\n${memory.map((m, i) => `${i+1}. ${m.text}`).join('\n')}`;
    }
    sys += `\n\nCurrent mode: ${MODES[mode].label}. Date: ${new Date().toLocaleDateString()}.`;
    return sys;
  };

  const send = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim(), mode, ts: Date.now() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const apiMessages = updatedMessages.map(m => ({ role: m.role, content: m.content }));
      
      const body = {
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: buildSystemPrompt(),
        messages: apiMessages,
      };

      if (webSearch) {
        body.tools = [{ type: "web_search_20250305", name: "web_search" }];
      }

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      // Extract text from content blocks
      const textBlocks = (data.content || []).filter(b => b.type === "text").map(b => b.text);
      const searchBlocks = (data.content || []).filter(b => b.type === "tool_use" && b.name === "web_search");
      const resultText = textBlocks.join("\n");

      const assistantMsg = {
        role: "assistant",
        content: resultText || "No response.",
        mode,
        ts: Date.now(),
        searched: searchBlocks.length > 0
      };

      if (data.usage) {
        setTotalTokens(t => t + (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0));
      }

      // Auto-extract memory if response contains facts
      const autoExtract = resultText.match(/\b(remember that|note:|key fact:|important:)\s*(.+)/gi);
      if (autoExtract && memoryOn) {
        // don't auto-add, just flag
      }

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant", content: `**Error:** ${err.message}`, mode, ts: Date.now(), isError: true
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, loading, messages, mode, webSearch, memoryOn, memory]);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const clearHistory = async () => {
    setMessages([]);
    try { await window.storage.delete(HISTORY_KEY); } catch {}
  };

  const currentMode = MODES[mode];

  return (
    <div style={{
      fontFamily: "'DM Mono', 'Fira Code', 'Courier New', monospace",
      background: "#080B0F",
      minHeight: "100vh",
      color: "#E2E8F0",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Syne:wght@700;800&display=swap');
        
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2D3748; border-radius: 2px; }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        .grid-bg {
          background-image: 
            linear-gradient(rgba(245,158,11,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245,158,11,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        
        .mode-btn {
          background: transparent;
          border: 1px solid #1E2533;
          border-radius: 4px;
          padding: 6px 12px;
          cursor: pointer;
          font-family: inherit;
          font-size: 10px;
          letter-spacing: 0.1em;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .mode-btn:hover { border-color: #4A5568; }
        .mode-btn.active { background: rgba(245,158,11,0.08); }
        
        .send-btn {
          background: #F59E0B;
          color: #080B0F;
          border: none;
          border-radius: 4px;
          padding: 10px 20px;
          font-family: inherit;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .send-btn:hover { background: #FBBF24; }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        
        .tool-toggle {
          background: transparent;
          border: 1px solid #1E2533;
          border-radius: 4px;
          padding: 6px 10px;
          cursor: pointer;
          font-family: inherit;
          font-size: 10px;
          letter-spacing: 0.08em;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .tool-toggle:hover { border-color: #4A5568; }
        .tool-toggle.on { border-color: #F59E0B; color: #F59E0B; background: rgba(245,158,11,0.06); }
        
        .msg-user { 
          background: rgba(245,158,11,0.07);
          border: 1px solid rgba(245,158,11,0.15);
          border-radius: 6px;
          padding: 12px 16px;
          margin-left: 40px;
        }
        .msg-assistant {
          background: rgba(255,255,255,0.03);
          border: 1px solid #1E2533;
          border-radius: 6px;
          padding: 14px 16px;
        }
        .msg-error { border-color: rgba(248,113,113,0.3); }
        
        .code-block {
          background: #0D1117;
          border: 1px solid #1E2533;
          border-radius: 4px;
          margin: 10px 0;
          overflow: hidden;
        }
        .code-lang {
          background: #1A2030;
          padding: 4px 12px;
          font-size: 10px;
          letter-spacing: 0.1em;
          color: #64748B;
          text-transform: uppercase;
        }
        .code-block pre { 
          padding: 14px; 
          overflow-x: auto; 
          font-size: 12px;
          line-height: 1.6;
          color: #A5F3A5;
        }
        .inline-code {
          background: #1A2030;
          border: 1px solid #2D3748;
          border-radius: 3px;
          padding: 1px 5px;
          font-size: 0.9em;
          color: #34D399;
        }
        .md-h1 { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 800; margin: 14px 0 8px; color: #F1F5F9; }
        .md-h2 { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; margin: 12px 0 6px; color: #CBD5E1; }
        .md-h3 { font-size: 13px; font-weight: 500; margin: 10px 0 5px; color: #94A3B8; letter-spacing: 0.05em; text-transform: uppercase; }
        .md-p { margin: 7px 0; line-height: 1.7; color: #CBD5E1; font-size: 13px; }
        .md-ul { padding-left: 18px; margin: 6px 0; list-style: none; }
        .md-li { position: relative; margin: 4px 0; line-height: 1.6; color: #CBD5E1; font-size: 13px; padding-left: 14px; }
        .md-li::before { content: "›"; position: absolute; left: 0; color: #F59E0B; }
        .md-hr { border: none; border-top: 1px solid #1E2533; margin: 12px 0; }
        strong { color: #F1F5F9; font-weight: 500; }
        em { color: #94A3B8; font-style: italic; }
        
        .typing-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #F59E0B;
          animation: pulse 1s ease-in-out infinite;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.15s; }
        .typing-dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes pulse { 0%,100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }
        
        textarea {
          resize: none;
          outline: none;
          width: 100%;
          background: transparent;
          border: none;
          color: #E2E8F0;
          font-family: inherit;
          font-size: 13px;
          line-height: 1.6;
        }
        textarea::placeholder { color: #4A5568; }
        
        .memory-item {
          background: rgba(255,255,255,0.02);
          border: 1px solid #1E2533;
          border-radius: 4px;
          padding: 8px 10px;
          font-size: 11px;
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 6px;
        }
        .del-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          color: #4A5568;
          font-size: 12px;
          transition: color 0.15s;
          padding: 0;
          flex-shrink: 0;
        }
        .del-btn:hover { color: #F87171; }
        
        .panel-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.6);
          z-index: 50;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 20px;
        }
        .panel {
          background: #0E1219;
          border: 1px solid #2D3748;
          border-radius: 8px;
          padding: 20px;
          width: 100%;
          max-width: 500px;
          max-height: 70vh;
          overflow-y: auto;
        }
        
        .timestamp { font-size: 10px; color: #374151; letter-spacing: 0.05em; }
        .badge { 
          font-size: 9px; 
          letter-spacing: 0.12em; 
          padding: 2px 6px; 
          border-radius: 2px;
          text-transform: uppercase;
        }
        
        .clear-btn {
          background: transparent;
          border: 1px solid #1E2533;
          border-radius: 4px;
          padding: 4px 10px;
          font-family: inherit;
          font-size: 10px;
          color: #64748B;
          cursor: pointer;
          letter-spacing: 0.08em;
          transition: all 0.15s;
        }
        .clear-btn:hover { color: #F87171; border-color: rgba(248,113,113,0.3); }
        
        .search-badge {
          font-size: 9px;
          color: #60A5FA;
          border: 1px solid rgba(96,165,250,0.3);
          border-radius: 2px;
          padding: 1px 5px;
          letter-spacing: 0.1em;
        }
      `}</style>

      {/* HEADER */}
      <div style={{
        borderBottom: "1px solid #1E2533",
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "52px",
        flexShrink: 0,
        background: "rgba(8,11,15,0.95)",
        backdropFilter: "blur(10px)"
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "28px", height: "28px",
            background: "linear-gradient(135deg, #F59E0B, #D97706)",
            borderRadius: "6px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "14px", fontWeight: "bold", color: "#080B0F",
            fontFamily: "'Syne', sans-serif"
          }}>⬡</div>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "14px", letterSpacing: "0.15em", color: "#F1F5F9" }}>OMNI</div>
            <div style={{ fontSize: "9px", color: "#4A5568", letterSpacing: "0.1em" }}>AGENT SYSTEM v1.0</div>
          </div>
        </div>

        {/* Mode indicator + controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            fontSize: "10px", letterSpacing: "0.1em",
            color: currentMode.color,
            border: `1px solid ${currentMode.color}40`,
            padding: "4px 10px",
            borderRadius: "3px",
            background: `${currentMode.color}08`
          }}>
            {currentMode.icon} {currentMode.label}
          </div>
          <button className="tool-toggle" onClick={() => setShowModes(true)}
            style={{ color: "#94A3B8" }}>SWITCH MODE</button>
          <button className="tool-toggle" onClick={() => setShowMemory(true)}
            style={{ color: memoryOn ? "#F59E0B" : "#94A3B8" }}>
            {memoryOn ? "◆" : "◇"} MEMORY {memory.length > 0 ? `[${memory.length}]` : ""}
          </button>
          {totalTokens > 0 && (
            <div className="timestamp" style={{ color: "#374151" }}>{totalTokens.toLocaleString()} tok</div>
          )}
          <button className="clear-btn" onClick={clearHistory}>CLEAR</button>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="grid-bg" style={{
        flex: 1,
        overflowY: "auto",
        padding: "20px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px"
      }}>
        {messages.length === 0 && (
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 20px",
            textAlign: "center"
          }}>
            <div style={{
              fontSize: "60px",
              marginBottom: "20px",
              opacity: 0.6
            }}>{currentMode.icon}</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "22px", color: currentMode.color, letterSpacing: "0.2em", marginBottom: "8px" }}>
              {currentMode.label}
            </div>
            <div style={{ fontSize: "12px", color: "#64748B", letterSpacing: "0.08em", maxWidth: "320px", lineHeight: 1.7 }}>
              {currentMode.desc}. All capabilities active.
            </div>
            <div style={{ marginTop: "30px", display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", maxWidth: "500px" }}>
              {[
                "Analyze this dataset →",
                "Write me a strategy →",
                "Build a Python script →",
                "Research latest AI trends →",
                "Generate creative concepts →",
                "Explain this system →"
              ].map(s => (
                <button key={s} onClick={() => setInput(s.replace(" →", ""))}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid #1E2533",
                    borderRadius: "4px",
                    padding: "6px 12px",
                    fontSize: "11px",
                    color: "#64748B",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    letterSpacing: "0.06em",
                    transition: "all 0.15s"
                  }}
                  onMouseOver={e => e.target.style.borderColor = "#4A5568"}
                  onMouseOut={e => e.target.style.borderColor = "#1E2533"}
                >{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const modeData = MODES[msg.mode] || currentMode;
          return (
            <div key={i}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px", paddingLeft: "4px" }}>
                <span style={{ fontSize: "10px", color: msg.role === "user" ? "#F59E0B" : modeData.color, letterSpacing: "0.1em" }}>
                  {msg.role === "user" ? "› YOU" : `⬡ ${modeData.label}`}
                </span>
                {msg.searched && <span className="search-badge">WEB SEARCH</span>}
                <span className="timestamp">{new Date(msg.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
              </div>

              <div className={`${msg.role === "user" ? "msg-user" : "msg-assistant"} ${msg.isError ? "msg-error" : ""}`}>
                {msg.role === "user"
                  ? <div style={{ fontSize: "13px", color: "#F1F5F9", lineHeight: 1.7 }}>{msg.content}</div>
                  : <div dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }} />
                }
              </div>
            </div>
          );
        })}

        {loading && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px", paddingLeft: "4px" }}>
              <span style={{ fontSize: "10px", color: currentMode.color, letterSpacing: "0.1em" }}>⬡ {currentMode.label}</span>
            </div>
            <div className="msg-assistant">
              <div style={{ display: "flex", gap: "6px", alignItems: "center", padding: "4px 0" }}>
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
                <span style={{ fontSize: "11px", color: "#374151", marginLeft: "4px", letterSpacing: "0.08em" }}>PROCESSING</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* INPUT AREA */}
      <div style={{
        borderTop: "1px solid #1E2533",
        background: "rgba(8,11,15,0.95)",
        backdropFilter: "blur(10px)",
        flexShrink: 0
      }}>
        {/* Toolbar */}
        <div style={{ padding: "8px 16px 0", display: "flex", gap: "6px", alignItems: "center" }}>
          <button
            className={`tool-toggle ${webSearch ? "on" : ""}`}
            onClick={() => setWebSearch(!webSearch)}
          >
            ⌕ WEB SEARCH {webSearch ? "ON" : "OFF"}
          </button>
          <button
            className={`tool-toggle ${memoryOn ? "on" : ""}`}
            onClick={() => setMemoryOn(!memoryOn)}
          >
            ◈ MEMORY {memoryOn ? "ON" : "OFF"}
          </button>
          <div style={{ marginLeft: "auto", fontSize: "10px", color: "#2D3748", letterSpacing: "0.08em" }}>
            SHIFT+ENTER FOR NEWLINE
          </div>
        </div>
        {/* Input */}
        <div style={{ padding: "10px 16px 14px", display: "flex", gap: "10px", alignItems: "flex-end" }}>
          <div style={{
            flex: 1,
            background: "#0E1219",
            border: "1px solid #2D3748",
            borderRadius: "6px",
            padding: "10px 14px",
            minHeight: "44px",
            display: "flex",
            alignItems: "flex-end"
          }}>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={handleKey}
              placeholder={`Ask ${currentMode.label.toLowerCase()} anything...`}
              style={{ minHeight: "22px", maxHeight: "120px" }}
            />
          </div>
          <button className="send-btn" onClick={send} disabled={loading || !input.trim()}>
            {loading ? "···" : "SEND ›"}
          </button>
        </div>
      </div>

      {/* MODE PANEL */}
      {showModes && (
        <div className="panel-overlay" onClick={() => setShowModes(false)}>
          <div className="panel" onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "13px", letterSpacing: "0.15em", marginBottom: "16px", color: "#F1F5F9" }}>
              SELECT COGNITIVE MODE
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {Object.entries(MODES).map(([key, m]) => (
                <button key={key}
                  onClick={() => { setMode(key); setShowModes(false); }}
                  style={{
                    background: mode === key ? `${m.color}10` : "rgba(255,255,255,0.02)",
                    border: `1px solid ${mode === key ? m.color + "40" : "#1E2533"}`,
                    borderRadius: "6px",
                    padding: "12px 14px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    transition: "all 0.15s"
                  }}
                >
                  <span style={{ fontSize: "20px", color: m.color }}>{m.icon}</span>
                  <div>
                    <div style={{ fontSize: "11px", letterSpacing: "0.12em", color: mode === key ? m.color : "#CBD5E1", fontWeight: "500" }}>{m.label}</div>
                    <div style={{ fontSize: "10px", color: "#64748B", marginTop: "2px", letterSpacing: "0.06em" }}>{m.desc}</div>
                  </div>
                  {mode === key && <span style={{ marginLeft: "auto", color: m.color, fontSize: "12px" }}>◆</span>}
                </button>
              ))}
            </div>
            <button className="clear-btn" onClick={() => setShowModes(false)} style={{ width: "100%", marginTop: "12px", padding: "10px" }}>CLOSE</button>
          </div>
        </div>
      )}

      {/* MEMORY PANEL */}
      {showMemory && (
        <div className="panel-overlay" onClick={() => setShowMemory(false)}>
          <div className="panel" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "13px", letterSpacing: "0.15em", color: "#F1F5F9" }}>
                PERSISTENT MEMORY
              </div>
              <span style={{ fontSize: "10px", color: "#64748B" }}>{memory.length} items stored</span>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  value={newMemoryNote}
                  onChange={e => setNewMemoryNote(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addMemoryNote()}
                  placeholder="Add a memory note..."
                  style={{
                    flex: 1,
                    background: "#0E1219",
                    border: "1px solid #2D3748",
                    borderRadius: "4px",
                    padding: "8px 12px",
                    fontFamily: "inherit",
                    fontSize: "11px",
                    color: "#E2E8F0",
                    outline: "none"
                  }}
                />
                <button onClick={addMemoryNote} className="send-btn" style={{ padding: "8px 14px", fontSize: "10px" }}>+ ADD</button>
              </div>
            </div>

            {memory.length === 0
              ? <div style={{ fontSize: "11px", color: "#374151", textAlign: "center", padding: "20px", letterSpacing: "0.08em" }}>
                  NO MEMORY ITEMS. ADD FACTS TO PERSIST ACROSS SESSIONS.
                </div>
              : memory.map(m => (
                  <div key={m.id} className="memory-item">
                    <span style={{ color: "#94A3B8", lineHeight: 1.5 }}>{m.text}</span>
                    <button className="del-btn" onClick={() => removeMemory(m.id)}>✕</button>
                  </div>
                ))
            }

            <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
              <button className="tool-toggle" style={{ flex: 1, justifyContent: "center" }}
                onClick={() => setMemoryOn(!memoryOn)}>
                {memoryOn ? "◆ MEMORY ACTIVE" : "◇ MEMORY INACTIVE"}
              </button>
              <button className="clear-btn" onClick={() => setShowMemory(false)} style={{ flex: 1 }}>CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
