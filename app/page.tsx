"use client";

import Link from "next/link";
import { ArrowUpRight, ChevronRight, PackageSearch, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { Brand } from "@/components/Brand";

const products = [
  { name: "Bamburi PowerPlus Cement", detail: "42.5N · 50 kg bag", price: "KSh 790", vendor: "BuildMart Nairobi", tone: "sand" },
  { name: "Duma 8mm Reinforcement Bar", detail: "12 m length · in stock", price: "KSh 1,150", vendor: "Steelworks Ltd", tone: "steel" },
  { name: "Crown Vinyl Matt Emulsion", detail: "20 L · APS shade", price: "KSh 8,920", vendor: "Crown Paints", tone: "olive" }
];

export default function LandingPage() {
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  return (
    <main className="site-shell">
      <header className="site-nav">
        <Brand />
        <nav aria-label="Primary navigation">
          <a href="#marketplace">Marketplace</a>
          <a href="#workspaces">Workspaces</a>
          <a href="#network">Network</a>
        </nav>
        <div className="nav-cta">
          <Link href="/login" className="text-link">Sign in</Link>
          <Link href="/signup" className="button button-bright">Get started <ArrowUpRight size={16} /></Link>
        </div>
      </header>

      <section className="hero-dark">
        <div className="hero-image" />
        <div className="hero-grid" />
        <div className="hero-content">
          <p className="kicker"><span className="live-dot" /> Kenya&apos;s construction operating system</p>
          <h1>Build with<br /><em>certainty.</em></h1>
          <p className="hero-lede">The connected workspace for projects, materials, suppliers and every decision that moves a site forward.</p>
          <div className="hero-actions">
            <Link href="/signup" className="button button-bright button-large">Start your workspace <ArrowUpRight size={18} /></Link>
            <a href="#marketplace" className="button button-ghost button-large">Explore marketplace</a>
          </div>
        </div>
        <div className="hero-status">
          <span>LIVE PROJECT SIGNAL</span>
          <strong>84%</strong>
          <small>Procurement readiness<br />Kileleshwa Residences</small>
        </div>
        <div className="hero-caption">01 — WORK HAPPENING NOW<br /><span>Nairobi, Kenya</span></div>
      </section>

      <section className="signal-bar" id="network">
        <span>ONE NETWORK. EVERY CONSTRUCTION DECISION.</span>
        <div><b>2,400+</b> verified products <i /> <b>86</b> suppliers <i /> <b>47</b> counties</div>
      </section>

      <section className="marketplace-section" id="marketplace">
        <div className="section-heading-row">
          <div><p className="kicker">MARKETPLACE / LIVE CATALOGUE</p><h2>Source what the<br />site needs.</h2></div>
          <p>Compare trusted offers against a governed product catalogue, then send RFQs directly to qualified suppliers.</p>
        </div>
        <div className="marketplace-search">
          <Search size={20} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cement, steel, paint, tools..." />
          <button onClick={() => setNotice(search ? `Searching the catalogue for “${search}”` : "Start typing to search the catalogue.")}>Search catalogue</button>
        </div>
        {notice ? <p className="search-notice">{notice}</p> : null}
        <div className="product-list">
          {products.map((product, index) => (
            <article className="product-row" key={product.name}>
              <div className={`product-visual ${product.tone}`}><span>0{index + 1}</span><PackageSearch size={34} /></div>
              <div className="product-info"><p>{product.detail}</p><h3>{product.name}</h3><span><ShieldCheck size={14} /> {product.vendor}</span></div>
              <strong>{product.price}<small>per unit</small></strong>
              <button className="round-button" aria-label={`View ${product.name}`} onClick={() => setNotice(`${product.name} added to your sourcing shortlist.`)}><ChevronRight size={20} /></button>
            </article>
          ))}
        </div>
        <Link href="/signup" className="market-link">View the complete marketplace <ArrowUpRight size={17} /></Link>
      </section>

      <section className="workspace-section" id="workspaces">
        <div className="workspace-visual"><div className="visual-label">PROJECT CONTROL ROOM <span>↗</span></div></div>
        <div className="workspace-copy">
          <p className="kicker">A WORKSPACE FOR EVERY ROLE</p>
          <h2>One source of<br />truth. <em>Built for action.</em></h2>
          <div className="workspace-options">
            <div><span>01</span><h3>Contractor</h3><p>Plan projects, issue RFQs and move from quote to delivery with a complete audit trail.</p></div>
            <div><span>02</span><h3>Supplier POS</h3><p>Publish commercial offers, respond to demand and keep stock, prices and fulfilment current.</p></div>
            <div><span>03</span><h3>Master POS</h3><p>Govern the canonical catalogue, resolve product matches and see the whole marketplace.</p></div>
          </div>
          <Link href="/signup" className="button button-dark">Choose your workspace <ArrowUpRight size={17} /></Link>
        </div>
      </section>

      <section className="closing-section">
        <Sparkles size={21} /><p className="kicker">BUILT FOR THE PEOPLE WHO BUILD</p><h2>The job is complex.<br /><em>Your system shouldn&apos;t be.</em></h2>
        <Link href="/signup" className="button button-bright button-large">Create your account <ArrowUpRight size={18} /></Link>
      </section>
      <footer><Brand /><span>© 2026 Wajenzi.ai</span><span>Built in Nairobi for East Africa.</span><span className="footer-links"><a href="#marketplace">Marketplace</a><a href="/login">Sign in</a></span></footer>
    </main>
  );
}
