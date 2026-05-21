import Link from "next/link";
import { ArrowRight, Bot, Box, DraftingCompass, Handshake, Send, Store } from "lucide-react";
import { Brand } from "@/components/Brand";

const features = [
  {
    icon: Box,
    title: "Smart Material Sourcing",
    text: "Real-time prices and availability from trusted hardware stores and manufacturers."
  },
  {
    icon: DraftingCompass,
    title: "AI Specifications",
    text: "Generate accurate material lists and project specs instantly."
  },
  {
    icon: Handshake,
    title: "Direct Connections",
    text: "Connect with verified hardware stores and manufacturers across Kenya."
  }
];

export default function LandingPage() {
  return (
    <main className="landing-page">
      <header className="nav">
        <Brand />
        <nav className="nav-links" aria-label="Primary navigation">
          <a href="#contractors">For Contractors</a>
          <a href="#hardware">For Hardware</a>
          <a href="#manufacturers">For Manufacturers</a>
        </nav>
        <div className="nav-actions">
          <Link className="button secondary" href="/login">
            Login
          </Link>
          <Link className="button primary" href="/signup">
            Sign Up
            <ArrowRight size={17} />
          </Link>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy centered">
          <div className="launch-pill">
            <span />
            <strong>Launching Soon</strong>
          </div>
          <h1>Where Builders Go</h1>
          <p>
            AI-powered platform for sourcing construction materials, specifications, and trusted
            partners across Kenya.
          </p>

          <div className="chat-prompt" aria-label="Wajenzi.ai material search preview">
            <div className="chat-inner">
              <Bot size={26} />
              <span>Ask about materials, prices, or project specs...</span>
              <Link href="/signup" className="chat-send" aria-label="Sign up to start asking">
                <Send size={18} />
              </Link>
            </div>
          </div>

          <div className="hero-actions centered-actions">
            <Link className="button light large" href="/signup">
              Join as Contractor
            </Link>
            <Link className="button outline large" href="/signup">
              Join as Hardware
            </Link>
            <Link className="button outline large" href="/signup">
              Join as Manufacturer
            </Link>
          </div>
        </div>
      </section>

      <section className="shop-band" id="hardware">
        <div className="shop-inner">
          <div className="shop-pill">
            <Store size={20} />
            <strong>Now Open</strong>
          </div>
          <h2>Shop Building Materials</h2>
          <p>Instant delivery • Competitive prices • Quality guaranteed</p>
          <a className="button light large" href="https://wajenzistores.com" target="_blank">
            Visit Wajenzi Stores
            <ArrowRight size={18} />
          </a>
          <span>Fast shipping across Kenya • Call 0748 333 000</span>
        </div>
      </section>

      <section className="section" id="contractors">
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card glass-card" key={feature.title}>
              <feature.icon size={34} />
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="final-cta" id="manufacturers">
        <div>
          <h2>Be the first to build with AI</h2>
          <p>Join Wajenzi.ai for early access to role-based construction procurement.</p>
          <div className="final-actions">
            <Link className="button primary large" href="/signup">
              Sign Up
              <ArrowRight size={18} />
            </Link>
            <Link className="button secondary large" href="/login">
              Login
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <Brand />
        <p>
          Shop building materials at{" "}
          <a href="https://wajenzistores.com" target="_blank">
            wajenzistores.com
          </a>
        </p>
        <a href="tel:0748333000">0748 333 000</a>
        <span>© 2026 Wajenzi.ai • Nairobi, Kenya</span>
      </footer>
    </main>
  );
}
