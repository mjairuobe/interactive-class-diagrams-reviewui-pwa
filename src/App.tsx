import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { motion, AnimatePresence } from "framer-motion";
import { CodeViewer } from "./components/CodeViewer";

// Konfigurierbare Responsive-Logik für den Zoom-Faktor
type ZoomConfig = {
  percentage: number;
  basedOn: "width" | "height";
};

type ResponsiveZoomConfig = {
  mobile: { portrait: ZoomConfig; landscape: ZoomConfig };
  tablet: { portrait: ZoomConfig; landscape: ZoomConfig };
  desktop: { portrait: ZoomConfig; landscape: ZoomConfig };
};

const ZOOM_CONFIG: ResponsiveZoomConfig = {
  mobile: {
    portrait: { percentage: 0.9, basedOn: "width" },
    landscape: { percentage: 0.75, basedOn: "height" },
  },
  tablet: {
    portrait: { percentage: 0.7, basedOn: "width" },
    landscape: { percentage: 0.6, basedOn: "height" },
  },
  desktop: {
    portrait: { percentage: 0.6, basedOn: "width" },
    landscape: { percentage: 0.5, basedOn: "height" },
  },
};

function getResponsiveZoomConfig(): ZoomConfig {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isPortrait = height > width;

  // Um zu erkennen, ob es sich physisch um ein Smartphone oder Tablet handelt,
  // nutzen wir die kürzere Seite des Bildschirms (da Handys im Landscape-Modus sehr breit werden).
  const shortSide = Math.min(width, height);

  if (shortSide < 600) {
    return isPortrait ? ZOOM_CONFIG.mobile.portrait : ZOOM_CONFIG.mobile.landscape;
  } else if (shortSide < 1024) {
    return isPortrait ? ZOOM_CONFIG.tablet.portrait : ZOOM_CONFIG.tablet.landscape;
  } else {
    return isPortrait ? ZOOM_CONFIG.desktop.portrait : ZOOM_CONFIG.desktop.landscape;
  }
}

const DIAGRAM = `classDiagram
  %% classMarker: User = added
  %% classMarker: Order = added
  %% classMarker: Payment = added
  %% relationMarker: gives = added
  %% relationMarker: sells = added
  %% relationMarker: pays = added
  %% highlight: Order.+submit() = added
  %% highlight: Payment.+amount = removed
  %% highlight: Product.+int objectNumber = removed
  %% highlight: Product.+String SKU = added
  %% highlight: Product.+list_products() = changed
  %% classRename: Product = StorageObject

  class User {
    +String uuid
    +String name
    +login()
    +logout()
  }
  class Order {
    +String id
    +Date created
    +submit()
  }
  class Warehouse {
    +String id
    +String location
    +List~Product~ products
    +addProduct()
  }
  class Product {
    +int objectNumber
    +String SKU
    +String title
    +Float price
    +list_products()
  }
  class Payment {
    +String id
    +Float amount
    +process()
  }

  User "1" --> "*" Order : gives
  Order "*" --> "*" Product : sells
  Order "1" --> "1" Payment : pays
  Warehouse "1" --> "*" Product : stores
`;

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  flowchart: { htmlLabels: true },
});

type MemberMarker = "changed" | "added" | "removed";
type Highlight = { className: string; member: string; marker: MemberMarker };
type ClassRename = { className: string; oldName: string };
type ClassMarker = { className: string; marker: MemberMarker };
type RelationMarker = { label: string; marker: MemberMarker };

const CLASS_MARKER_STYLE: Record<MemberMarker, { fill: string; stroke: string }> = {
  changed: { fill: "#fef3c7", stroke: "#d97706" },
  added: { fill: "#dcfce7", stroke: "#16a34a" },
  removed: { fill: "#fee2e2", stroke: "#dc2626" },
};

const MARKER_STYLE: Record<MemberMarker, { fill: string; color: string; label: string }> = {
  changed: { fill: "#fde68a", color: "#7c2d12", label: "geändert" },
  added: { fill: "#bbf7d0", color: "#14532d", label: "hinzugefügt" },
  removed: { fill: "#fecaca", color: "#7f1d1d", label: "entfernt" },
};

function parseHighlights(src: string): Highlight[] {
  const out: Highlight[] = [];
  const re = /%%\s*highlight:\s*([A-Za-z_][\w]*)\.(.+?)\s*=\s*(changed|added|removed)\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    out.push({
      className: m[1],
      member: m[2].trim(),
      marker: m[3] as MemberMarker,
    });
  }
  return out;
}

function parseClassRenames(src: string): ClassRename[] {
  const out: ClassRename[] = [];
  const re = /%%\s*classRename:\s*([A-Za-z_][\w]*)\s*=\s*([A-Za-z_][\w]*)\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    out.push({ className: m[1], oldName: m[2] });
  }
  return out;
}

function parseClassMarkers(src: string): ClassMarker[] {
  const out: ClassMarker[] = [];
  const re = /%%\s*classMarker:\s*([A-Za-z_][\w]*)\s*=\s*(changed|added|removed)\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    out.push({ className: m[1], marker: m[2] as MemberMarker });
  }
  return out;
}

function parseRelationMarkers(src: string): RelationMarker[] {
  const out: RelationMarker[] = [];
  const re = /%%\s*relationMarker:\s*(.+?)\s*=\s*(changed|added|removed)\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    out.push({ label: m[1].trim(), marker: m[2] as MemberMarker });
  }
  return out;
}

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const transformComponentRef = useRef<ReactZoomPanPinchRef>(null);
  
  const [selected, setSelected] = useState<string | null>(null);
  const [renderKey, setRenderKey] = useState(0);
  
  // Code Viewer State
  const [codeViewerOpen, setCodeViewerOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState("");
  
  // Header Sichtbarkeit
  const [showHeader, setShowHeader] = useState(true);

  // Auto-Hide Header nach 5 Sekunden
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHeader(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const highlights = parseHighlights(DIAGRAM);
  const classRenames = parseClassRenames(DIAGRAM);
  const classMarkers = parseClassMarkers(DIAGRAM);
  const relationMarkers = parseRelationMarkers(DIAGRAM);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!containerRef.current) return;
      const { svg, bindFunctions } = await mermaid.render(
        `mermaid-svg-${renderKey}`,
        DIAGRAM,
      );
      if (cancelled || !containerRef.current) return;
      containerRef.current.innerHTML = svg;
      const svgEl = containerRef.current.querySelector("svg");
      if (svgEl) {
        svgEl.style.maxWidth = "none"; // allow zooming beyond 100%
        
        // Lese die tatsächlichen viewBox Dimensionen aus, um die physische DOM-Größe festzusetzen.
        // Dadurch entspricht bbox.height genau den echten Pixeln, was für den korrekten Zoom essenziell ist.
        const viewBox = svgEl.getAttribute("viewBox");
        if (viewBox) {
          const [, , w, h] = viewBox.split(" ");
          svgEl.style.width = `${w}px`;
          svgEl.style.height = `${h}px`;
        } else {
          svgEl.style.height = "auto";
          svgEl.removeAttribute("width");
        }
      }
      bindFunctions?.(containerRef.current);
      applyClassMarkers();
      applyMemberHighlights();
      applyClassRenames();
      applyRelationMarkers();
      applySelection();
      makeMembersClickable();
      makeRelationsClickable();

      // Initiale Zentrierung auf "User"
      setTimeout(() => focusClass("User"), 100);
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [renderKey]);

  useEffect(() => {
    applySelection();
  }, [selected]);

  function nodeId(node: SVGGElement): string | null {
    const raw = node.id || "";
    const m = raw.match(/(?:classId|flowchart|node)[-_](.+?)[-_]\d+$/);
    if (m) return m[1];
    return node.getAttribute("data-id");
  }

  function applySelection() {
    if (!containerRef.current) return;
    const nodes = containerRef.current.querySelectorAll<SVGGElement>(
      "g.node, g.classGroup",
    );
    nodes.forEach((node) => {
      const id = nodeId(node);
      if (!id) return;
      node.classList.toggle("poc-selected", selected === id);
    });
  }

  function focusClass(className: string) {
    if (!containerRef.current || !transformComponentRef.current) return;
    const nodes = containerRef.current.querySelectorAll<SVGGElement>("g.node, g.classGroup");
    const target = Array.from(nodes).find(n => nodeId(n) === className);
    
    if (target) {
      const containerWidth = containerRef.current.parentElement?.clientWidth || window.innerWidth;
      const containerHeight = containerRef.current.parentElement?.clientHeight || window.innerHeight;
      try {
        const bbox = (target as unknown as SVGGraphicsElement).getBBox();
        if (!bbox || (bbox.width === 0 && bbox.height === 0)) return;
        
        const config = getResponsiveZoomConfig();
        let scale = 1;
        
        if (config.basedOn === "width" && bbox.width > 0) {
          scale = (containerWidth * config.percentage) / bbox.width;
        } else if (config.basedOn === "height" && bbox.height > 0) {
          scale = (containerHeight * config.percentage) / bbox.height;
        }

        if (isNaN(scale) || !isFinite(scale)) scale = 1;
        
        const finalScale = Math.min(scale, 3); // Max zoom level
        
        // Nutze die native ZoomToElement Funktion von react-zoom-pan-pinch
        transformComponentRef.current.zoomToElement(target as HTMLElement, finalScale, 800, "easeOut");
        setSelected(className);
      } catch (e) {
        console.error("Konnte BBox nicht lesen", e);
      }
    }
  }

  function openCodeViewer(memberId: string) {
    setSelectedMember(memberId);
    setCodeViewerOpen(true);
  }

  function makeMembersClickable() {
    if (!containerRef.current) return;
    const nodes = containerRef.current.querySelectorAll<SVGGElement>("g.node, g.classGroup");
    
    nodes.forEach(node => {
      const id = nodeId(node);
      if (!id) return;
      
      const htmlElements = node.querySelectorAll<HTMLElement>("foreignObject *");
      Array.from(htmlElements).forEach(el => {
        const txt = (el.textContent ?? "").trim();
        // Wenn es nicht der Klassentitel ist und direkter Text vorhanden ist
        if (txt && txt !== id) {
            el.style.cursor = "pointer";
            el.classList.add("hover:opacity-80", "transition-opacity");
            el.onclick = (e) => {
               e.stopPropagation();
               e.preventDefault();
               openCodeViewer(`${id}.${txt}`);
            }
        }
      });
      
      // Erlaube auch Klicks auf die Klasse selbst, um sie zu zentrieren
      const titleEl = Array.from(htmlElements).find(el => (el.textContent ?? "").trim() === id);
      if (titleEl) {
        titleEl.style.cursor = "pointer";
        titleEl.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            focusClass(id);
        }
      }
    });
  }

  function makeRelationsClickable() {
    // Parser für Diagramm-Relationen, um Klick-Ziele (beide Richtungen) zu definieren
    const relationsMap: Record<string, { from: string; to: string }> = {};
    const re = /([A-Za-z_][\w]*)\s*".*?"\s*-->\s*".*?"\s*([A-Za-z_][\w]*)\s*:\s*(.+)/g;
    let m;
    while ((m = re.exec(DIAGRAM)) !== null) {
      const from = m[1];
      const to = m[2];
      const label = m[3].trim();
      relationsMap[label] = { from, to };
    }

    if (!containerRef.current) return;
    const fos = Array.from(
      containerRef.current.querySelectorAll<SVGForeignObjectElement>("foreignObject")
    );

    fos.forEach((fo) => {
      if (fo.closest("g.classGroup, g.node")) return; // Ist innerhalb einer Klasse
      const label = (fo.textContent ?? "").trim();
      const rel = relationsMap[label];
      
      if (rel) {
        const inner = fo.querySelector<HTMLElement>("p, span, div") || fo;
        inner.style.cursor = "pointer";
        inner.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          
          if (!containerRef.current) return;
          const wrapper = containerRef.current.parentElement;
          const nodes = containerRef.current.querySelectorAll<SVGGElement>("g.node, g.classGroup");
          let fromNode: SVGGElement | null = null;
          let toNode: SVGGElement | null = null;
          
          nodes.forEach(n => {
            const id = nodeId(n);
            if (id === rel.from) fromNode = n;
            if (id === rel.to) toNode = n;
          });

          if (!wrapper || !fromNode || !toNode) {
            focusClass(rel.to); // Fallback
            return;
          }

          const wrapperRect = wrapper.getBoundingClientRect();
          const fromRect = fromNode.getBoundingClientRect();
          const toRect = toNode.getBoundingClientRect();

          const getVisiblePercentage = (rect: DOMRect, wrap: DOMRect) => {
            const left = Math.max(rect.left, wrap.left);
            const right = Math.min(rect.right, wrap.right);
            const top = Math.max(rect.top, wrap.top);
            const bottom = Math.min(rect.bottom, wrap.bottom);
            const w = Math.max(0, right - left);
            const h = Math.max(0, bottom - top);
            const visibleArea = w * h;
            const totalArea = rect.width * rect.height;
            return totalArea > 0 ? visibleArea / totalArea : 0;
          };

          const fromPct = getVisiblePercentage(fromRect, wrapperRect);
          const toPct = getVisiblePercentage(toRect, wrapperRect);

          // Springe zu der Klasse, die prozentual weniger sichtbar ist
          if (fromPct < toPct) {
            focusClass(rel.from);
          } else {
            focusClass(rel.to);
          }
        };
      }
    });
  }

  // --- Utility Functions for highlighting from PoC ---
  function normalize(s: string): string {
    return s.replace(/\s+/g, "").trim();
  }

  function memberSignatureKey(s: string): string {
    return normalize(s).replace(/~([^~]+)~/g, "<$1>");
  }

  function textMatchesMemberLabel(wantFromSource: string, domText: string): boolean {
    const w = normalize(wantFromSource);
    const d = normalize(domText);
    if (w === d) return true;
    return memberSignatureKey(wantFromSource) === memberSignatureKey(domText);
  }

  function findInnermostMatch(elements: HTMLElement[], memberLabelFromSource: string): HTMLElement | null {
    const matches: HTMLElement[] = [];
    for (const el of elements) {
      let direct = "";
      el.childNodes.forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE) direct += n.textContent ?? "";
      });
      if (textMatchesMemberLabel(memberLabelFromSource, direct)) {
        matches.push(el);
      }
    }
    if (matches.length > 0) return matches[matches.length - 1];

    const allMatching = elements.filter((el) =>
      textMatchesMemberLabel(memberLabelFromSource, el.textContent ?? ""),
    );
    if (allMatching.length === 0) return null;
    return allMatching.reduce((best, cur) =>
      cur.contains(best) ? best : cur,
    );
  }

  function highlightMemberInNode(classGroup: SVGGElement, h: Highlight) {
    const style = MARKER_STYLE[h.marker];
    const want = h.member;

    const htmlCandidates = classGroup.querySelectorAll<HTMLElement>("foreignObject *");
    const htmlMatch = findInnermostMatch(Array.from(htmlCandidates), want);
    if (htmlMatch) {
      htmlMatch.style.background = style.fill;
      htmlMatch.style.color = style.color;
      htmlMatch.style.fontWeight = "700";
      htmlMatch.style.borderRadius = "3px";
      htmlMatch.style.margin = "0";
      if (h.marker === "removed") {
        htmlMatch.style.textDecoration = "line-through";
      }
      htmlMatch.classList.add("poc-member-highlight");

      const fo = htmlMatch.closest("foreignObject");
      if (fo) {
        const w = parseFloat(fo.getAttribute("width") || "0");
        if (!Number.isNaN(w) && w > 0) {
          fo.setAttribute("width", String(w + 12));
          const tr = fo.parentElement?.getAttribute("transform") || "";
          const tm = tr.match(/translate\(([-\d.]+)\s*,\s*([-\d.]+)\)/);
          if (tm && fo.parentElement) {
            const nx = parseFloat(tm[1]) - 6;
            const ny = parseFloat(tm[2]);
            fo.parentElement.setAttribute("transform", `translate(${nx},${ny})`);
          }
        }
      }
      return;
    }
  }

  function applyMemberHighlights() {
    if (!containerRef.current) return;
    const nodes = containerRef.current.querySelectorAll<SVGGElement>("g.node, g.classGroup");
    const byClass = new Map<string, Highlight[]>();
    highlights.forEach((h) => {
      const arr = byClass.get(h.className) ?? [];
      arr.push(h);
      byClass.set(h.className, arr);
    });
    nodes.forEach((node) => {
      const id = nodeId(node);
      if (!id) return;
      const list = byClass.get(id);
      if (!list || list.length === 0) return;
      list.forEach((h) => highlightMemberInNode(node, h));
    });
  }

  function applyClassMarkers() {
    if (!containerRef.current) return;
    if (classMarkers.length === 0) return;
    const nodes = containerRef.current.querySelectorAll<SVGGElement>("g.node, g.classGroup");
    nodes.forEach((node) => {
      const id = nodeId(node);
      if (!id) return;
      const cm = classMarkers.find((x) => x.className === id);
      if (!cm) return;
      const style = CLASS_MARKER_STYLE[cm.marker];
      node.querySelectorAll<SVGRectElement | SVGPathElement>("rect, path").forEach((el) => {
        el.style.setProperty("fill", style.fill, "important");
      });
      if (cm.marker === "added" || cm.marker === "removed") {
        try {
          const bbox = (node as unknown as SVGGraphicsElement).getBBox();
          const pad = 6;
          const ns = "http://www.w3.org/2000/svg";
          const border = document.createElementNS(ns, "rect");
          border.setAttribute("x", String(bbox.x - pad));
          border.setAttribute("y", String(bbox.y - pad));
          border.setAttribute("width", String(bbox.width + pad * 2));
          border.setAttribute("height", String(bbox.height + pad * 2));
          border.setAttribute("rx", "6");
          border.setAttribute("ry", "6");
          border.setAttribute("fill", "none");
          border.setAttribute("pointer-events", "none");
          border.style.setProperty("stroke", style.stroke, "important");
          border.style.setProperty("stroke-width", "6px", "important");
          border.style.setProperty("stroke-dasharray", "12 7", "important");
          border.setAttribute("class", "poc-class-border");
          if (node.firstChild) {
            node.insertBefore(border, node.firstChild);
          } else {
            node.appendChild(border);
          }
        } catch {}
      }
    });
  }

  function applyClassRenames() {
    if (!containerRef.current) return;
    const nodes = containerRef.current.querySelectorAll<SVGGElement>("g.node, g.classGroup");
    nodes.forEach((node) => {
      const id = nodeId(node);
      if (!id) return;
      const r = classRenames.find((x) => x.className === id);
      if (!r) return;
      const fos = Array.from(node.querySelectorAll<SVGForeignObjectElement>("foreignObject"));
      let titleFo: SVGForeignObjectElement | null = null;
      let topY = Infinity;
      for (const fo of fos) {
        const txt = (fo.textContent ?? "").trim();
        if (txt !== id) continue;
        const parent = fo.parentElement;
        const tr = parent?.getAttribute("transform") || "";
        const tm = tr.match(/translate\(([-\d.]+)\s*,\s*([-\d.]+)\)/);
        const y = tm ? parseFloat(tm[2]) : 0;
        if (y < topY) {
          topY = y;
          titleFo = fo;
        }
      }
      if (!titleFo) return;

      const addedStyle = MARKER_STYLE.added;
      const titleText = titleFo.querySelector<HTMLElement>("p, span, div");
      if (titleText) {
        titleText.style.background = addedStyle.fill;
        titleText.style.color = addedStyle.color;
        titleText.style.borderRadius = "3px";
        titleText.style.margin = "0";
      }
    });
  }

  function applyRelationMarkers() {
    if (!containerRef.current) return;
    if (relationMarkers.length === 0) return;
    const fos = Array.from(containerRef.current.querySelectorAll<SVGForeignObjectElement>("foreignObject"));
    relationMarkers.forEach((rm) => {
      const target = fos.find((fo) => {
        if (fo.closest("g.classGroup, g.node")) return false;
        return (fo.textContent ?? "").trim() === rm.label;
      });
      if (!target) return;
      const inner = target.querySelector<HTMLElement>("p, span, div");
      if (!inner) return;
      const style = MARKER_STYLE[rm.marker];
      inner.style.background = style.fill;
      inner.style.color = style.color;
      inner.style.fontWeight = "700";
      inner.style.borderRadius = "5px";
      inner.style.padding = "4px 12px";
      inner.style.margin = "0";
      inner.style.boxSizing = "border-box";
      inner.style.display = "inline-block";
      inner.style.lineHeight = "1.35";
      if (rm.marker === "removed") inner.style.textDecoration = "line-through";
    });
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-slate-50 text-slate-900 overflow-hidden relative">
      <AnimatePresence>
        {showHeader && (
          <motion.header 
            initial={{ y: 0, opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute top-0 left-0 right-0 z-20 flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur-sm px-4 py-3 shadow-sm"
          >
            <div>
              <h1 className="text-lg font-semibold sm:text-xl">
                Mobile-First Code Review
              </h1>
              <p className="text-xs text-slate-500 sm:text-sm">
                Tippe auf Klassen zum Fokussieren · Tippe auf Methoden für Quellcode · Pinch zum Zoomen
              </p>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      <main className="relative flex-1 bg-slate-100 overflow-hidden w-full h-full">
        <TransformWrapper
          ref={transformComponentRef}
          initialScale={1}
          minScale={0.1}
          maxScale={5}
          centerOnInit={true}
          limitToBounds={false}
          panning={{ velocityDisabled: false }}
          wheel={{ step: 0.001 }}
        >
          <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%" }}>
            <div
              ref={containerRef}
              className="mermaid-host h-full w-full"
            />
          </TransformComponent>
        </TransformWrapper>
      </main>

      <CodeViewer 
        isOpen={codeViewerOpen} 
        onClose={() => setCodeViewerOpen(false)} 
        title={selectedMember} 
      />

      <style>{`
        .mermaid-host g.node, .mermaid-host g.classGroup { transition: filter 120ms ease; }
        .mermaid-host g.poc-selected > rect,
        .mermaid-host g.poc-selected > path,
        .mermaid-host g.poc-selected > polygon {
          stroke: #1d4ed8 !important;
          stroke-width: 3px !important;
        }
        /* Make cursor grabby globally inside the transform component */
        .react-transform-component { cursor: grab; }
        .react-transform-component:active { cursor: grabbing; }
      `}</style>
    </div>
  );
}

export default App;
