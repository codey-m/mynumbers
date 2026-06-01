import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { initCarousel } from "../../explainer/carousel"
import { initSampler } from "../../explainer/sampler"
import { initPerms } from "../../explainer/perms"
import { ExplainerContainer, ExplainerGlobalStyles } from "./ExplainerStyles"

export function ExplainerPage() {
  const navigate = useNavigate()

  useEffect(() => {
    document.body.classList.add("explainer-mode")
    initSampler()
    initPerms()
    initCarousel()

    return () => {
      document.body.classList.remove("explainer-mode")
    }
  }, [])

  return (
    <>
      <ExplainerGlobalStyles />
      <ExplainerContainer>
      {/* Top bar */}
      <header className="ex-topbar" aria-label="Explainer navigation">
        <button className="ex-back" aria-label="Back to game" onClick={() => navigate("/")}>
          ←
        </button>
        <div className="ex-title-block">
          <div className="ex-title">Inside <span className="ex-brand">ARITHMIX</span></div>
          <div className="ex-subtitle" id="ex-slide-subtitle">From random expression to playable challenge</div>
        </div>
        <div className="ex-counter"><span id="ex-current">1</span>/<span id="ex-total">5</span></div>
      </header>

      <div className="ex-progress" aria-hidden="true">
        <div className="ex-progress-fill" id="ex-progress-fill" />
      </div>

      {/* Persistent puzzle strip */}
      <section className="ex-puzzle-strip" aria-label="Running example puzzle">
        <div className="ex-mini-target">
          <span className="ex-mini-label">Target</span>
          <span className="ex-mini-target-val">29</span>
        </div>
        <div className="ex-mini-template" aria-label="Template">
          <span className="ex-tok ex-tok-paren">(</span><span className="ex-tok ex-tok-paren">(</span>
          <span className="ex-mini-slot">__</span>
          <span className="ex-tok ex-tok-op">+</span>
          <span className="ex-mini-slot">__</span>
          <span className="ex-tok ex-tok-paren">)</span>
          <span className="ex-tok ex-tok-op">×</span>
          <span className="ex-mini-slot">__</span>
          <span className="ex-tok ex-tok-paren">)</span>
          <span className="ex-tok ex-tok-op">−</span>
          <span className="ex-tok ex-tok-paren">(</span>
          <span className="ex-mini-slot">__</span>
          <span className="ex-tok ex-tok-op">÷</span>
          <span className="ex-mini-slot">__</span>
          <span className="ex-tok ex-tok-paren">)</span>
        </div>
        <div className="ex-mini-bank" aria-label="Bank">
          <span className="ex-mini-chip">2</span>
          <span className="ex-mini-chip">3</span>
          <span className="ex-mini-chip">4</span>
          <span className="ex-mini-chip">5</span>
          <span className="ex-mini-chip">7</span>
          <span className="ex-mini-chip">8</span>
          <span className="ex-mini-chip">9</span>
        </div>
      </section>

      {/* Carousel */}
      <div className="ex-viewport" id="ex-viewport" role="region" aria-roledescription="carousel" aria-label="Explainer slides" tabIndex={0}>
        <div className="ex-track" id="ex-track">

          {/* Slide 1: Pipeline overview */}
          <section className="ex-slide" data-slide="1" data-tone="neutral" aria-label="Slide 1: Pipeline overview">
            <h2 className="ex-h">Follow one puzzle from random expression to playable challenge!</h2>
            <p className="ex-sub">Every puzzle moves through four stages on the server before you ever see it. Tap a stage to jump there.</p>

            <div className="ex-pipeline" id="ex-pipeline" aria-label="Pipeline stages">
              <button className="ex-stage" data-jump="2" data-tone="tree" aria-label="Build stage">
                <div className="ex-stage-mini" data-stage="build">
                  <span className="ex-mini-node" /><span className="ex-mini-edge" /><span className="ex-mini-node" /><span className="ex-mini-edge" /><span className="ex-mini-node" /><span className="ex-mini-ok">✓</span>
                </div>
                <div className="ex-stage-name">Build</div>
                <div className="ex-stage-tag">expression tree</div>
              </button>
              <span className="ex-pipe-arrow">→</span>
              <button className="ex-stage" data-jump="3" data-tone="prob" aria-label="Sample stage">
                <div className="ex-stage-mini" data-stage="filter">
                  <span className="ex-mini-x">✕</span><span className="ex-mini-x">✕</span><span className="ex-mini-x">✕</span><span className="ex-mini-ok">✓</span>
                </div>
                <div className="ex-stage-name">Sample</div>
                <div className="ex-stage-tag">accept / reject</div>
              </button>
              <span className="ex-pipe-arrow">→</span>
              <button className="ex-stage" data-jump="4" data-tone="search" aria-label="Verify stage">
                <div className="ex-stage-mini" data-stage="verify">
                  <span className="ex-mini-perm" /><span className="ex-mini-perm" /><span className="ex-mini-perm" /><span className="ex-mini-ok">✓</span>
                </div>
                <div className="ex-stage-name">Verify</div>
                <div className="ex-stage-tag">permutations</div>
              </button>
              <span className="ex-pipe-arrow">→</span>
              <button className="ex-stage" data-tone="connect" data-jump="5" aria-label="Connect stage">
                <div className="ex-stage-mini" data-stage="play">
                  <span className="ex-mini-chip">4</span><span className="ex-mini-chip">7</span><span className="ex-mini-ok">✓</span>
                </div>
                <div className="ex-stage-name">Connect</div>
                <div className="ex-stage-tag">to the courses</div>
              </button>
            </div>
          </section>

          {/* Slide 2: Expression Trees */}
          <section className="ex-slide" data-slide="2" data-tone="tree" aria-label="Slide 2: Expression trees">
            <div className="ex-row-head">
              <h2 className="ex-h">A puzzle begins as a tree</h2>
              <span className="ex-course-tag" data-course="cs">6.100.2x · recursion &amp; trees</span>
            </div>
            <p className="ex-sub">The tree builds itself top-down on arrival. <strong>Tap any node</strong> to walk its subtree post-order and reveal each running value.</p>

            <div className="ex-tree-layout">
              <div className="ex-tree-col-visual">
                <div className="ex-tree-wrap">
                  <svg className="ex-tree-svg" id="tree-svg" viewBox="0 0 560 300" aria-label="Expression tree" />
                </div>
              </div>
              <div className="ex-tree-col-readout">
                <div className="ex-tree-readout">
                  <div className="ex-readout-label" id="tree-readout-label">select a node to begin</div>
                  <div className="ex-readout-line">
                    <div className="ex-readout-expr" id="tree-sub-expr" />
                    <div className="ex-readout-val" id="tree-sub-val" />
                  </div>
                </div>
                <button className="ex-deeper" data-drawer="d2">Go deeper ▾</button>
                <div className="ex-drawer" id="d2" hidden>
                  <p>Internal nodes are operators in {'{+, −, ×, ÷}'} and leaves are integers. Evaluation is a post-order walk: compute the left and right children, then apply the operator. Pretty-printing only adds parentheses when a child's precedence is lower than the current operator's. That's why <code>(4 + 7) × 3</code> keeps its inner parens but <code>4 + 7</code> alone would not.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Slide 3: Rejection Sampling */}
          <section className="ex-slide" data-slide="3" data-tone="prob" aria-label="Slide 3: Rejection sampling">
            <div className="ex-row-head">
              <h2 className="ex-h">Most random expressions are rejected</h2>
              <span className="ex-course-tag" data-course="prob">Probability &amp; Statistical Data Analysis · PRIMARY</span>
            </div>
            <p className="ex-sub">The server keeps drawing random expressions until one lands an integer result inside the target band. Each attempt is a <strong>Bernoulli trial</strong>; the number of trials before the first success follows a <strong>geometric distribution</strong> with mean&nbsp;1/p.</p>

            <div className="ex-sampler">
              <div className="ex-sampler-controls">
                <div className="ex-control">
                  <label htmlFor="s-ops">Operators</label>
                  <select id="s-ops">
                    <option value="add">+ only</option>
                    <option value="addsub">+ and −</option>
                    <option value="all">+ − × ÷</option>
                  </select>
                </div>
                <div className="ex-control">
                  <label htmlFor="s-range">Target band</label>
                  <select id="s-range">
                    <option value="wide">10 – 99 (wide)</option>
                    <option value="mid">20 – 60 (mid)</option>
                    <option value="narrow">25 – 35 (narrow)</option>
                  </select>
                </div>
                <button id="s-run" className="ex-mini-btn ex-mini-btn-primary">Run sampler</button>
                <p className="ex-tip">Each row is a real random expression generated client-side. Green is accepted; red shows why it failed.</p>
              </div>

              <div className="ex-sampler-out">
                <div className="ex-stream" id="s-stream" aria-live="polite" />
                <div className="ex-stats">
                  <div className="ex-stat-card">
                    <div className="ex-stat-name">Acceptance rate <em>p</em></div>
                    <div className="ex-stat-val" id="s-p" />
                  </div>
                  <div className="ex-stat-card">
                    <div className="ex-stat-name">Expected attempts 1/<em>p</em></div>
                    <div className="ex-stat-val" id="s-exp" />
                  </div>
                  <div className="ex-stat-card">
                    <div className="ex-stat-name">P(fail in 2000) = (1−<em>p</em>)<sup>2000</sup></div>
                    <div className="ex-stat-val" id="s-fail" />
                  </div>
                </div>
              </div>
            </div>

            <button className="ex-deeper" data-drawer="d3">Go deeper ▾</button>
            <div className="ex-drawer" id="d3" hidden>
              <p><strong>Why the (1−p)<sup>2000</sup> matters.</strong> ARITHMIX caps generation at 2000 attempts per request. For the wide band with all four operators, p stays high enough that the cap is effectively never reached. Tighten the band above to <strong>25 – 35 (narrow)</strong> with all four operators and acceptance drops to p ≈ <strong id="d3-narrow-p" />. Expected wait climbs to <strong id="d3-narrow-exp" /> attempts and (1−p)<sup>2000</sup> = <strong id="d3-narrow-fail" />. The difficulty configs in <code>puzzles.py</code> stay on the safe side of that curve.</p>
            </div>
          </section>

          {/* Slide 4: Permutation Verification */}
          <section className="ex-slide" data-slide="4" data-tone="search" aria-label="Slide 4: Permutation verification">
            <div className="ex-row-head">
              <h2 className="ex-h">Can the number bank actually solve the puzzle?</h2>
              <span className="ex-course-tag" data-course="prob">Probability &amp; Statistical Data Analysis · PRIMARY</span>
            </div>
            <p className="ex-sub">Each verification step is the same routine: <strong>pick</strong> five distinct chips from the seven-chip bank in a chosen order, <strong>drop</strong> them into the slots, <strong>evaluate</strong> the expression, and <strong>compare</strong> against the target. A miss advances to the next arrangement; a hit stops the search.</p>

            <div className="ex-perm">
              <div className="ex-perm-board" aria-label="Template with slots">
                <span className="ex-paren">(</span><span className="ex-paren">(</span>
                <span className="ex-pslot" data-slot="0">__</span>
                <span className="ex-op">+</span>
                <span className="ex-pslot" data-slot="1">__</span>
                <span className="ex-paren">)</span>
                <span className="ex-op">×</span>
                <span className="ex-pslot" data-slot="2">__</span>
                <span className="ex-paren">)</span>
                <span className="ex-op">−</span>
                <span className="ex-paren">(</span>
                <span className="ex-pslot" data-slot="3">__</span>
                <span className="ex-op">÷</span>
                <span className="ex-pslot" data-slot="4">__</span>
                <span className="ex-paren">)</span>
                <span className="ex-eq">=</span>
                <span className="ex-result" id="p-result" />
                <span className="ex-result-check" id="p-match" aria-hidden="true">✓</span>
              </div>

              <div className="ex-perm-controls">
                <button id="p-step" className="ex-mini-btn">Step</button>
                <button id="p-auto" className="ex-mini-btn ex-mini-btn-primary">Autoplay</button>
                <button id="p-reset" className="ex-mini-btn">Reset</button>
                <div className="ex-counter-card">
                  <span id="p-count">0</span> / <span id="p-total">2520</span> checked
                </div>
              </div>

              <div className="ex-formula-card">
                <div className="ex-formula-label">Permutations of 5 from a bank of 7</div>
                <div className="ex-formula">P(7, 5) = 7 × 6 × 5 × 4 × 3 = <strong>2520</strong></div>
                <div className="ex-formula-label" style={{ marginTop: "8px" }}>Expected checks until a solution</div>
                <div className="ex-formula"><strong id="p-solutions" /> arrangements solve this puzzle &nbsp;→&nbsp; expect ≈ <strong id="p-expected" /> checks</div>
              </div>
            </div>

            <button className="ex-deeper" data-drawer="d4">Go deeper ▾</button>
            <div className="ex-drawer" id="d4" hidden>
              <p>Search stops at the first arrangement that hits the target, so verification cost depends on how many solutions <em>S</em> the puzzle has. If <em>S</em> successes are uniformly distributed across <em>N</em> = 2520 arrangements, the expected position of the first hit is <em>E</em> = (<em>N</em> + 1) / (<em>S</em> + 1). A puzzle with many solutions resolves in a few hundred steps; a sparse puzzle (<em>S</em> = 1) climbs to ≈ 1260. That's why permutation verification stays cheap on the server: most puzzles short‑circuit long before scanning all 2520.</p>
            </div>
          </section>

          {/* Slide 5: MIT Learn */}
          <section className="ex-slide" data-slide="5" data-tone="neutral" aria-label="Slide 5: MIT Learn connections">
            <h2 className="ex-h">Go further with MIT courses!</h2>

            <div className="ex-courses">
              <article className="ex-course-card ex-course-primary">
                <div className="ex-course-flag">PRIMARY</div>
                <h3>Probability and Statistical Data Analysis</h3>
                <p className="ex-course-blurb">The math behind why some puzzles are easy to generate and others almost impossible.</p>
                <ul>
                  <li>Bernoulli trials</li>
                  <li>Geometric distribution</li>
                  <li>Expected value</li>
                  <li>Permutations and counting</li>
                </ul>
                <a href="#" className="ex-course-cta" data-cta="primary">Explore the course →</a>
              </article>

              <article className="ex-course-card ex-course-secondary">
                <div className="ex-course-flag">SECONDARY · active on MITx</div>
                <h3>6.100.2x: Introduction to Computational Thinking and Data Science</h3>
                <p className="ex-course-blurb">The data structures and algorithms that turn the math into running code.</p>
                <ul>
                  <li>Recursion &amp; trees</li>
                  <li>Simulation &amp; sampling</li>
                  <li>Search</li>
                  <li>Operator precedence &amp; parsing</li>
                </ul>
                <a href="https://learn.mit.edu/search?q=computational+thinking&resource=2971" className="ex-course-cta" data-cta="secondary">Explore the course →</a>
              </article>
            </div>

            <div className="ex-concepts">
              <div className="ex-readout-label">Jump back to a concept</div>
              <div className="ex-chip-row">
                <button className="ex-concept-chip" data-jump="2" data-highlight="tree">Trees</button>
                <button className="ex-concept-chip" data-jump="2" data-highlight="recursion">Recursion</button>
                <button className="ex-concept-chip" data-jump="3" data-highlight="rejection">Rejection sampling</button>
                <button className="ex-concept-chip" data-jump="3" data-highlight="geometric">Geometric distribution</button>
                <button className="ex-concept-chip" data-jump="4" data-highlight="perms">Permutations</button>
              </div>
            </div>

            <div className="ex-final-cta">
              <a className="ex-cta ex-cta-primary" href="https://learn.mit.edu" target="_blank" rel="noopener">Explore Courses</a>
              <button className="ex-cta ex-cta-secondary" onClick={() => navigate("/")}>Play ARITHMIX →</button>
            </div>
          </section>
        </div>
      </div>

      {/* Navigation */}
      <nav className="ex-nav" aria-label="Slide controls">
        <button id="ex-prev" className="ex-nav-btn">← Prev</button>
        <div className="ex-dots" id="ex-dots" role="tablist" aria-label="Slide indicators" />
        <button id="ex-next" className="ex-nav-btn ex-nav-btn-primary">Next →</button>
      </nav>
    </ExplainerContainer>
    </>
  )
}
