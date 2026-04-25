import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageSquare, Send, ChevronDown, Bot, User } from "lucide-react";

export interface CodeViewerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

const DUMMY_DIFFS: Record<string, string> = {
  "User": `+export class User {
+  public uuid: string;
+  public name: string;
+
+  constructor(uuid: string, name: string) {
+    this.uuid = uuid;
+    this.name = name;
+  }
+
+  public login() {
+    // authenticate via OAuth
+    Session.start(this.uuid);
+  }
+
+  public logout() {
+    Session.end(this.uuid);
+  }
+}
`,
  "Order": `+export class Order {
+  public id: string;
+  public created: Date;
+
+  constructor(id: string) {
+    this.id = id;
+    this.created = new Date();
+  }
+
+  public submit() {
+    // publish event to message broker
+    EventBus.publish('order_submitted', this);
+  }
+}
`,
  "Warehouse": ` export class Warehouse {
   public id: string;
   public location: string;
   public products: Product[];
 
   constructor(id: string, location: string) {
     this.id = id;
     this.location = location;
     this.products = [];
   }
 
   public addProduct(product: Product) {
     this.products.push(product);
   }
 }
`,
  "Product": ` // Renamed from Product to StorageObject
-export class Product {
-  public objectNumber: number;
+export class StorageObject {
+  public SKU: string;
   public title: string;
   public price: number;
 
-  constructor(objectNumber: number, title: string, price: number) {
-    this.objectNumber = objectNumber;
+  constructor(sku: string, title: string, price: number) {
+    this.SKU = sku;
     this.title = title;
     this.price = price;
   }
 
-  public list_products() {
-    return DB.query(\`SELECT * FROM products WHERE obj_num = \${this.objectNumber}\`);
+  public list_products() {
+    // Optimized query using SKU index
+    return DB.query(\`SELECT * FROM storage_objects WHERE sku = '\${this.SKU}' LIMIT 100\`);
   }
 }
`,
  "Payment": ` export class Payment {
   public id: string;
-  public amount: number;
 
-  constructor(id: string, amount: number) {
+  constructor(id: string) {
     this.id = id;
-    this.amount = amount;
   }
 
   public process() {
-    Gateway.charge(this.id, this.amount);
+    // Amount is now dynamically calculated by the gateway
+    Gateway.chargeCurrentBalance(this.id);
   }
 }
`
};

export function CodeViewer({ isOpen, onClose, title }: CodeViewerProps) {
  const [html, setHtml] = useState<string>("");
  
  // Chat & Selection States
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const [selectedCode, setSelectedCode] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ sender: "user" | "ai"; text: string; isHtml?: boolean }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isSendDropdownOpen, setIsSendDropdownOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (!isOpen) return;
    
    async function highlight() {
      // Extrahiere den Klassennamen aus dem Titel (z.B. "Product.+list_products()" -> "Product")
      const className = title.split('.')[0];
      const diffCode = DUMMY_DIFFS[className] || `// Keine Änderungen für ${className} gefunden.\n`;

      // Shiki configuration for highlighting diffs
      const result = await codeToHtml(diffCode, {
        lang: "diff",
        theme: "github-dark",
      });
      setHtml(result);
    }
    
    highlight();
  }, [isOpen, title]);

  // Schließe den Chat und Tooltip, wenn der CodeViewer geschlossen wird
  useEffect(() => {
    if (!isOpen) {
      setIsChatOpen(false);
      setTooltipPos(null);
    }
  }, [isOpen]);

  const updateContextAndNotify = (text: string, pos: { top: number; left: number } | null) => {
    setSelectedCode(text);
    if (isChatOpen) {
      // Wenn der Chat schon offen ist, zeige keinen Tooltip, sondern sende direkt eine Event-Meldung
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.text === `📝 Fokus geändert auf: "${text}"`) return prev;
        return [...prev, { sender: "ai", text: `📝 Fokus geändert auf: "${text}"` }];
      });
      setTooltipPos(null);
    } else {
      setTooltipPos(pos);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    // 1. Text-Selektion (Drag) prüfen
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      const text = selection.toString().trim();
      if (text) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        updateContextAndNotify(text, {
          top: rect.top - 45,
          left: rect.left + rect.width / 2,
        });
        return;
      }
    }
    
    // 2. Klick/Tap auf einzelnes Wort/Token prüfen
    const target = e.target as HTMLElement;
    // Shiki rendert echte Tokens in Spans, die nicht die Klasse "line" haben
    if (target.tagName === "SPAN" && !target.classList.contains("line")) {
      const word = target.textContent?.trim();
      if (word && word.length > 0) {
        updateContextAndNotify(word, {
          top: e.clientY - 45,
          left: e.clientX,
        });
        return;
      }
    }
    
    // Klick ins Leere schließt den Tooltip
    if (!isChatOpen) {
      setTooltipPos(null);
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    const userMsg = inputValue;
    setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setInputValue("");
    setIsSendDropdownOpen(false);
    
    // Spezifischer Trigger für "Datenbank"
    if (userMsg.toLowerCase().includes("datenbank")) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [...prev, { 
          sender: "ai", 
          isHtml: true,
          text: 'Die Datenbankabfrage zeigt, dass ein relationales Datenbankmanagementsystem verwendet wird.<br/><br/>Anhand der Library <i>psycopg</i> in der <a href="#" class="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">requirements.txt</a> sehe ich, dass es sich um eine PostgreSQL-Datenbank handelt.'
        }]);
      }, 500);
      return;
    }
    
    // Simuliere eine Standard-KI-Antwort
    setTimeout(() => {
      setMessages((prev) => [...prev, { sender: "ai", text: "Das ist eine simulierte Antwort der KI. Ich habe deinen Code gelesen!" }]);
    }, 1000);
  };

  const handleSendWebhook = () => {
    if (!inputValue.trim()) return;
    setMessages((prev) => [...prev, { sender: "user", text: `[Webhook] ${inputValue}` }]);
    setInputValue("");
    setIsSendDropdownOpen(false);
    
    setTimeout(() => {
      setMessages((prev) => [...prev, { sender: "ai", text: "✅ Deine Anfrage wurde als Ticket an den Webhook übermittelt." }]);
    }, 600);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />

          {/* Slide-over panel */}
          <motion.div
            initial={{ x: "100%", boxShadow: "-10px 0 30px rgba(0,0,0,0)" }}
            animate={{ x: 0, boxShadow: "-10px 0 30px rgba(0,0,0,0.15)" }}
            exit={{ x: "100%", boxShadow: "-10px 0 30px rgba(0,0,0,0)" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-slate-900 text-slate-100 sm:w-[480px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-700/50 bg-slate-800/50 px-4 py-3 backdrop-blur-md">
              <h2 className="text-sm font-semibold tracking-wide text-slate-200">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-100 focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content / Code */}
            <div 
              className="flex-1 overflow-auto p-4 relative"
              onPointerUp={handlePointerUp}
            >
              <div className="mb-4 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200/80">
                <strong>Dummy Diff Ansicht:</strong> Hier siehst du beispielhaft, wie geänderte Zeilen dargestellt werden. Später werden hier die echten Diff-Informationen der Versionskontrolle angezeigt.
              </div>
              <div
                className="prose prose-invert max-w-none text-sm leading-relaxed shiki-container"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
            
            {/* Tooltip für Ask/Comment */}
            <AnimatePresence>
              {tooltipPos && !isChatOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="fixed z-[60] -translate-x-1/2 rounded-md border border-slate-700 bg-slate-800 p-1 shadow-lg"
                  style={{ top: tooltipPos.top, left: tooltipPos.left }}
                >
                  <button
                    onClick={() => {
                      setIsChatOpen(true);
                      setTooltipPos(null);
                      if (messages.length === 0) {
                        setMessages([{ sender: "ai", text: `Hallo! Du hast eine Frage zu "${selectedCode}"? Wie kann ich helfen?` }]);
                      } else {
                        // Falls schon ein Chat existiert und das Tooltip genutzt wurde
                        setMessages(prev => [...prev, { sender: "ai", text: `📝 Fokus geändert auf: "${selectedCode}"` }]);
                      }
                    }}
                    className="flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:bg-indigo-600 hover:text-white"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Ask / Comment
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Chat Popup */}
            <AnimatePresence>
              {isChatOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 50, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  className="absolute bottom-4 left-4 right-4 z-[70] flex flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
                  style={{ maxHeight: "60vh" }}
                >
                  {/* Chat Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 bg-slate-800/80 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-indigo-400" />
                      <h3 className="text-sm font-semibold text-slate-200">AI Assistant</h3>
                    </div>
                    <button
                      onClick={() => setIsChatOpen(false)}
                      className="rounded-full p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {/* Markierter Code Kontext */}
                  <div className="border-b border-slate-800 bg-slate-900/50 p-3 text-xs">
                    <span className="text-slate-500">Kontext: </span>
                    <code className="rounded bg-slate-800 px-1 py-0.5 text-slate-300">
                      {selectedCode.length > 40 ? selectedCode.substring(0, 40) + "..." : selectedCode}
                    </code>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${msg.sender === "user" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-200 leading-relaxed"}`}>
                          {msg.isHtml ? (
                            <span dangerouslySetInnerHTML={{ __html: msg.text }} />
                          ) : (
                            msg.text
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Tipp-Animation (Typing Indicator) */}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] rounded-lg bg-slate-800 px-4 py-3 shadow-sm">
                          <div className="flex gap-1.5 items-center">
                            <motion.div className="h-1.5 w-1.5 rounded-full bg-slate-400" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                            <motion.div className="h-1.5 w-1.5 rounded-full bg-slate-400" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                            <motion.div className="h-1.5 w-1.5 rounded-full bg-slate-400" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="border-t border-slate-800 bg-slate-900 p-3">
                    <div className="flex items-end gap-2">
                      <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Stelle eine Frage..."
                        className="max-h-32 min-h-[40px] flex-1 resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      
                      {/* Send Button Group */}
                      <div className="relative flex items-center">
                        <div className="flex rounded-lg shadow-sm">
                          <button
                            onClick={handleSendMessage}
                            className="flex items-center justify-center rounded-l-lg bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700 focus:outline-none"
                            title="Senden"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setIsSendDropdownOpen(!isSendDropdownOpen)}
                            className="flex items-center justify-center rounded-r-lg border-l border-indigo-700 bg-indigo-600 px-2 py-2 text-white hover:bg-indigo-700 focus:outline-none"
                            title="Weitere Sende-Optionen"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                          {isSendDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute bottom-full right-0 mb-2 w-48 rounded-md border border-slate-700 bg-slate-800 py-1 shadow-lg"
                            >
                              <button
                                onClick={handleSendWebhook}
                                className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 focus:outline-none"
                              >
                                An Webhook senden
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <style>{`
              /* Custom styles for shiki diff */
              .shiki-container pre {
                background-color: transparent !important;
                margin: 0;
                padding: 0;
              }
              .shiki-container code {
                display: block;
                min-width: 100%;
              }
              .shiki-container .line {
                display: inline-block;
                width: 100%;
                padding: 0 12px;
              }
              /* Very basic diff coloring fallback if theme doesn't handle it well */
              .shiki-container .line:has(.token.deleted) {
                background-color: rgba(248, 81, 73, 0.15);
              }
              .shiki-container .line:has(.token.inserted) {
                background-color: rgba(46, 160, 67, 0.15);
              }
            `}</style>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
