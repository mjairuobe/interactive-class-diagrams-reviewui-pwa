import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export interface CodeViewerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

const DUMMY_DIFF_CODE = `export class User {
  public uuid: string;
  public name: string;

- public loginWithPassword() {
-   // old implementation
- }
+ public login() {
+   // new implementation with OAuth
+   this.authenticate();
+ }

  public logout() {
    this.clearSession();
  }
}
`;

export function CodeViewer({ isOpen, onClose, title }: CodeViewerProps) {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;
    
    async function highlight() {
      // Shiki configuration for highlighting diffs
      const result = await codeToHtml(DUMMY_DIFF_CODE, {
        lang: "diff",
        theme: "github-dark",
      });
      setHtml(result);
    }
    
    highlight();
  }, [isOpen]);

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
            <div className="flex-1 overflow-auto p-4">
              <div className="mb-4 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200/80">
                <strong>Dummy Diff Ansicht:</strong> Hier siehst du beispielhaft, wie geänderte Zeilen dargestellt werden. Später werden hier die echten Diff-Informationen der Versionskontrolle angezeigt.
              </div>
              <div
                className="prose prose-invert max-w-none text-sm leading-relaxed shiki-container"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
            
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
