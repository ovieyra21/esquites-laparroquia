import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, Flame, MapPin, Clock, Phone, Sparkles, ShoppingBag, Instagram, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Logo } from "@/components/Logo";
import { PRODUCTS, CATEGORIES, type CategoryId } from "@/data/catalog";
import heroEsquite from "@/assets/hero-esquite.jpg";
import dishLokos from "@/assets/dish-lokos.jpg";
import dishUchepos from "@/assets/dish-uchepos.jpg";
import dishMaruchan from "@/assets/dish-maruchan.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Esquites La Parroquia · El sabor que se antoja" },
      {
        name: "description",
        content:
          "Menú digital de Esquites La Parroquia en Acámbaro, Gto. Elotes, lokos, uchepos, maruchan y más. Arma tu antojo y pásate a probarlos.",
      },
      { property: "og:title", content: "Esquites La Parroquia · El sabor que se antoja" },
      { property: "og:description", content: "Arma tu antojo y descubre nuestro menú: elotes, lokos, uchepos y más." },
      { property: "og:image", content: "/__l5e/og-esquites.jpg" },
    ],
  }),
  component: LandingPage,
});

// ---------- SECTION COPY ----------
const SECTION_META: Record<CategoryId, { title: string; tag: string; image?: string }> = {
  elote: { title: "Los Monarcas", tag: "Elotes en todas sus formas", image: heroEsquite },
  lokos: { title: "Los Lokos", tag: "Preparados con todo el mugrero", image: dishLokos },
  preparados: { title: "Los Clásicos Preparados", tag: "El combo de siempre" },
  fritura: { title: "Zona Crunch", tag: "Frituras, churros y antojos" },
  maruchan: { title: "Zona Antihangover", tag: "Maruchan que revive", image: dishMaruchan },
  chicharron: { title: "El Crujiente", tag: "Chicharrón preparado" },
  uchepos: { title: "Tradición Purépecha", tag: "Tamales de elote tierno", image: dishUchepos },
};

const SECTION_ORDER: CategoryId[] = ["elote", "lokos", "preparados", "fritura", "maruchan", "chicharron", "uchepos"];

// ---------- BUILDER OPTIONS ----------
const BASES = [
  { id: "blanco", label: "Elote Blanco", sub: "Tradicional" },
  { id: "amarillo", label: "Elote Amarillo", sub: "Más dulce" },
];
const FORMATS = [
  { id: "chico", label: "Vaso Chico", price: 35 },
  { id: "mediano", label: "Vaso Mediano", price: 45 },
  { id: "grande", label: "Vaso Grande", price: 50 },
  { id: "cazuela", label: "Cazuelita", price: 40 },
];
const FRITURAS = ["Takis", "Doritos", "Tostitos", "Ruffles", "Cheetos", "Churros"];
const TOPPINGS = ["Queso", "Crema", "Mayonesa", "Cacahuate japonés", "Chiles en vinagre", "Salsa Valentina", "Limón"];

function LandingPage() {
  // Builder state
  const [base, setBase] = useState<string | null>(null);
  const [format, setFormat] = useState<string | null>(null);
  const [frituras, setFrituras] = useState<string[]>([]);
  const [toppings, setToppings] = useState<string[]>([]);
  const [spice, setSpice] = useState<number[]>([2]);

  const toggle = (set: string[], item: string, setter: (v: string[]) => void) =>
    setter(set.includes(item) ? set.filter((x) => x !== item) : [...set, item]);

  const fillLevel = useMemo(() => {
    let n = 0;
    if (base) n += 25;
    if (format) n += 25;
    n += Math.min(25, frituras.length * 10);
    n += Math.min(25, toppings.length * 6);
    return Math.min(100, n);
  }, [base, format, frituras, toppings]);

  const fillColor =
    spice[0] >= 4 ? "from-red-500 to-orange-400" : spice[0] >= 2 ? "from-amber-400 to-yellow-300" : "from-yellow-200 to-amber-200";

  const summary = [
    base && BASES.find((b) => b.id === base)?.label,
    format && FORMATS.find((f) => f.id === format)?.label,
    frituras.length > 0 && `con ${frituras.join(", ")}`,
    toppings.length > 0 && `+ ${toppings.join(", ")}`,
  ].filter(Boolean);

  // WhatsApp order link
  const waMessage = encodeURIComponent(
    `¡Hola! Quiero armar mi antojo:\n${summary.join("\n")}\nNivel de chile: ${["nada", "poquito", "normal", "bravo", "demonio"][spice[0]]}.`,
  );

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* NAV */}
      <header className="fixed top-0 inset-x-0 z-50 glass">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-8 py-3">
          <div className="flex items-center gap-3">
            <Logo size={40} />
            <div className="leading-tight">
              <div className="font-display text-base md:text-lg gold-text">Esquites La Parroquia</div>
              <div className="text-[10px] text-muted-foreground tracking-widest uppercase">Acámbaro · Gto.</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#builder" className="hover:text-gold transition">Arma tu antojo</a>
            <a href="#menu" className="hover:text-gold transition">Menú</a>
            <a href="#visita" className="hover:text-gold transition">Visítanos</a>
          </nav>
          <Button asChild size="sm" className="bg-gradient-to-r from-[oklch(0.78_0.13_82)] to-[oklch(0.72_0.14_75)] text-primary-foreground shadow-[var(--shadow-gold)]">
            <a href={`https://wa.me/524171234567?text=${waMessage}`} target="_blank" rel="noopener">
              <ShoppingBag className="size-4" /> Pedir
            </a>
          </Button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <img
          src={heroEsquite}
          alt="Esquite humeante con queso y limón"
          width={1920}
          height={1080}
          className="absolute inset-0 w-full h-full object-cover scale-110 animate-[fade-in_1.2s_ease-out]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
        <div className="absolute inset-0 bg-gradient-to-tr from-background/80 via-transparent to-transparent" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center py-32 animate-fade-in">
          <Badge className="mb-6 bg-gold/20 text-gold border-gold/40 backdrop-blur">
            <Sparkles className="size-3 mr-1" /> Hecho en Acámbaro desde siempre
          </Badge>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[1.05] mb-6">
            El sabor que <span className="gold-text italic">se antoja</span>.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Elotes humeantes, lokos imposibles y uchepos como los de la abuela.
            <br />Ven, arma el tuyo y llévate el antojo.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              asChild
              className="h-14 px-8 text-base bg-gradient-to-r from-[oklch(0.78_0.13_82)] to-[oklch(0.72_0.14_75)] text-primary-foreground shadow-[var(--shadow-gold)] hover-scale"
            >
              <a href="#builder">Ver el menú (bajo tu propio antojo)</a>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-14 px-8 text-base gold-border">
              <a href="#visita"><MapPin className="size-4" /> Cómo llegar</a>
            </Button>
          </div>
        </div>

        <a href="#builder" aria-label="Bajar" className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 animate-bounce text-gold">
          <ChevronDown className="size-8" />
        </a>
      </section>

      {/* BUILDER */}
      <section id="builder" className="relative py-24 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="gold-border text-gold mb-4">Esquite Builder</Badge>
            <h2 className="font-display text-4xl md:text-6xl mb-4">¡Arma tu <span className="gold-text">antojo ideal</span>!</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Pícale a las opciones y mira cómo se llena tu vaso en tiempo real.</p>
          </div>

          <div className="grid lg:grid-cols-[1fr_360px] gap-10 items-start">
            {/* Steps */}
            <div className="space-y-8">
              <BuilderStep n={1} title="Elige tu base">
                <div className="grid grid-cols-2 gap-3">
                  {BASES.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setBase(b.id)}
                      className={`p-5 rounded-2xl border text-left transition-all hover-scale ${
                        base === b.id ? "border-gold bg-gold/10 shadow-[var(--shadow-gold)]" : "border-border bg-card hover:border-gold/40"
                      }`}
                    >
                      <div className="text-3xl mb-2">🌽</div>
                      <div className="font-display text-lg">{b.label}</div>
                      <div className="text-xs text-muted-foreground">{b.sub}</div>
                    </button>
                  ))}
                </div>
              </BuilderStep>

              <BuilderStep n={2} title="Elige el formato">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {FORMATS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFormat(f.id)}
                      className={`p-4 rounded-2xl border text-center transition-all hover-scale ${
                        format === f.id ? "border-gold bg-gold/10" : "border-border bg-card hover:border-gold/40"
                      }`}
                    >
                      <div className="text-2xl mb-1">{f.id === "cazuela" ? "🍲" : "🥤"}</div>
                      <div className="font-medium text-sm">{f.label}</div>
                      <div className="text-xs text-gold mt-1">${f.price}</div>
                    </button>
                  ))}
                </div>
              </BuilderStep>

              <BuilderStep n={3} title="El mugrero (frituras)" hint="Elige las que quieras">
                <div className="flex flex-wrap gap-2">
                  {FRITURAS.map((f) => (
                    <button
                      key={f}
                      onClick={() => toggle(frituras, f, setFrituras)}
                      className={`px-4 py-2 rounded-full text-sm border transition-all ${
                        frituras.includes(f) ? "bg-gold text-primary-foreground border-gold" : "border-border bg-card hover:border-gold/40"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </BuilderStep>

              <BuilderStep n={4} title="Los toppings">
                <div className="flex flex-wrap gap-2">
                  {TOPPINGS.map((t) => (
                    <button
                      key={t}
                      onClick={() => toggle(toppings, t, setToppings)}
                      className={`px-4 py-2 rounded-full text-sm border transition-all ${
                        toppings.includes(t) ? "bg-gold text-primary-foreground border-gold" : "border-border bg-card hover:border-gold/40"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </BuilderStep>

              <BuilderStep n={5} title="¿Qué tan bravo?" hint="Mueve el chile">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Flame
                        key={i}
                        className={`size-6 transition ${i <= spice[0] ? "text-red-500 fill-red-500/30" : "text-muted-foreground/30"}`}
                      />
                    ))}
                  </div>
                  <Slider value={spice} onValueChange={setSpice} min={0} max={4} step={1} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Del que no pica</span>
                    <span className="text-red-400 font-medium">{["nada", "poquito", "normal", "bravo", "demonio"][spice[0]]}</span>
                    <span>Del que pica</span>
                  </div>
                </div>
              </BuilderStep>
            </div>

            {/* Live cup */}
            <div className="lg:sticky lg:top-24">
              <div className="rounded-3xl glass p-6 shadow-[var(--shadow-soft)]">
                <div className="text-center mb-4">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Tu antojo</div>
                  <div className="font-display text-2xl gold-text">
                    {summary.length ? "¡Ya casi!" : "Empieza a armarlo"}
                  </div>
                </div>

                {/* The cup */}
                <div className="relative mx-auto w-44 h-56 mb-5">
                  <div className="absolute inset-0 rounded-b-[2rem] rounded-t-md border-4 border-gold/60 bg-card/40 overflow-hidden">
                    <div
                      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${fillColor} transition-all duration-700 ease-out`}
                      style={{ height: `${fillLevel}%` }}
                    >
                      {fillLevel > 60 && (
                        <div className="absolute -top-3 left-0 right-0 flex justify-around text-2xl animate-fade-in">
                          {frituras.slice(0, 3).map((_, i) => <span key={i}>🌶️</span>)}
                        </div>
                      )}
                    </div>
                    {fillLevel > 40 && (
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-3xl opacity-70">💨</div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-48 h-3 bg-gold/20 rounded-full blur-md" />
                </div>

                <div className="text-xs text-muted-foreground text-center min-h-[40px]">
                  {summary.length ? summary.join(" · ") : "Elige la base para empezar"}
                </div>

                <Button
                  className="w-full mt-5 h-12 bg-gradient-to-r from-[oklch(0.78_0.13_82)] to-[oklch(0.72_0.14_75)] text-primary-foreground shadow-[var(--shadow-gold)]"
                  disabled={!base || !format}
                  asChild={Boolean(base && format)}
                >
                  {base && format ? (
                    <a href={`https://wa.me/524171234567?text=${waMessage}`} target="_blank" rel="noopener">
                      ¡Lo quiero ya! 🔥
                    </a>
                  ) : (
                    <span>Completa los pasos</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED PHOTOS */}
      <section className="py-16 px-4 md:px-8">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-4">
          {[
            { img: dishLokos, label: "Los Lokos", desc: "Doritos, takis y todo el mugrero" },
            { img: dishUchepos, label: "Uchepos", desc: "Tradición purépecha en cada bocado" },
            { img: dishMaruchan, label: "Maruchan", desc: "El antídoto perfecto" },
          ].map((p) => (
            <div key={p.label} className="relative group rounded-2xl overflow-hidden aspect-square hover-scale">
              <img src={p.img} alt={p.label} loading="lazy" width={1024} height={1024} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-5">
                <div className="font-display text-2xl gold-text">{p.label}</div>
                <div className="text-sm text-muted-foreground">{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MENU */}
      <section id="menu" className="py-24 px-4 md:px-8 relative">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="gold-border text-gold mb-4">Carta completa</Badge>
            <h2 className="font-display text-4xl md:text-6xl mb-4">El <span className="gold-text">menú</span></h2>
            <p className="text-muted-foreground">Todo lo que tenemos, ordenado por familias.</p>
          </div>

          <Accordion type="multiple" defaultValue={["elote"]} className="space-y-3">
            {SECTION_ORDER.map((catId) => {
              const cat = CATEGORIES.find((c) => c.id === catId);
              if (!cat) return null;
              const items = PRODUCTS.filter((p) => p.category === catId);
              if (items.length === 0) return null;
              const meta = SECTION_META[catId];
              return (
                <AccordionItem key={catId} value={catId} className="border border-border rounded-2xl bg-card overflow-hidden">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline">
                    <div className="flex items-center gap-4 text-left">
                      <div className="text-3xl">{cat.emoji}</div>
                      <div>
                        <div className="font-display text-xl">{meta.title}</div>
                        <div className="text-xs text-muted-foreground">{meta.tag}</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5">
                    <ul className="grid sm:grid-cols-2 gap-2">
                      {items.map((it) => (
                        <li key={it.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-background/60 border border-border hover:border-gold/40 transition">
                          <div className="min-w-0">
                            <div className="font-medium text-sm flex items-center gap-2">
                              <span>{it.emoji}</span>
                              <span className="truncate">{it.name}</span>
                            </div>
                            {it.description && (
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{it.description}</div>
                            )}
                          </div>
                          <div className="text-gold font-display text-lg shrink-0">${it.price}</div>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </section>

      {/* VISIT */}
      <section id="visita" className="py-24 px-4 md:px-8 bg-gradient-to-b from-transparent to-surface">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          <div>
            <Badge variant="outline" className="gold-border text-gold mb-4">Visítanos</Badge>
            <h2 className="font-display text-4xl md:text-5xl mb-4">Pásate a <span className="gold-text">probarlos</span></h2>
            <p className="text-muted-foreground mb-6">Te esperamos en pleno corazón de Acámbaro. El antojo se cumple recién hecho.</p>

            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3"><MapPin className="size-5 text-gold" /> Acámbaro, Guanajuato</li>
              <li className="flex items-center gap-3"><Clock className="size-5 text-gold" /> Mar–Dom · 5:00 PM – 11:00 PM</li>
              <li className="flex items-center gap-3"><Phone className="size-5 text-gold" /> +52 417 123 4567</li>
            </ul>

            <Button asChild size="lg" className="mt-6 bg-gradient-to-r from-[oklch(0.78_0.13_82)] to-[oklch(0.72_0.14_75)] text-primary-foreground shadow-[var(--shadow-gold)]">
              <a href="https://maps.google.com/?q=Acámbaro+Guanajuato+esquites" target="_blank" rel="noopener">
                <MapPin className="size-5" /> Llévame al antojo
              </a>
            </Button>
          </div>
          <div className="relative aspect-square rounded-3xl overflow-hidden glass">
            <iframe
              title="Mapa Acámbaro"
              src="https://www.google.com/maps?q=Ac%C3%A1mbaro%2C%20Guanajuato&output=embed"
              className="w-full h-full border-0"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-10 px-4 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div>
              <div className="font-display gold-text">Esquites La Parroquia</div>
              <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} · Acámbaro, Gto.</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="#" aria-label="Instagram" className="p-2 rounded-full border border-border hover:border-gold/40 transition"><Instagram className="size-4" /></a>
            <a href="#" aria-label="Facebook" className="p-2 rounded-full border border-border hover:border-gold/40 transition"><Facebook className="size-4" /></a>
            <Link to="/auth" className="text-xs text-muted-foreground hover:text-gold transition ml-3">Acceso staff</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function BuilderStep({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="size-8 rounded-full bg-gradient-to-br from-[oklch(0.78_0.13_82)] to-[oklch(0.72_0.14_75)] text-primary-foreground grid place-items-center font-display text-sm shadow-[var(--shadow-gold)]">
          {n}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-lg">{title}</div>
          {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}
