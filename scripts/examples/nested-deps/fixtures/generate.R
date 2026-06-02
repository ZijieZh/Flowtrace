#!/usr/bin/env Rscript
# Research-synthesis fixtures — slate-themed ggplot2 charts + structured docs.

suppressPackageStartupMessages({
  library(ggplot2)
})

script_path <- (function() {
  args <- commandArgs(trailingOnly = FALSE)
  ix <- grep("--file=", args, fixed = TRUE)
  if (length(ix) > 0) return(sub("--file=", "", args[ix[1]]))
  if (sys.nframe() > 0L) {
    f <- tryCatch(sys.frame(1)$ofile, error = function(e) NULL)
    if (!is.null(f)) return(f)
  }
  "fixtures/generate.R"
})()
here <- dirname(normalizePath(script_path, mustWork = FALSE))
if (!dir.exists(here)) here <- "fixtures"

INK <- "#0f172a"; INK_SOFT <- "#334155"; INK_MUTED <- "#94a3b8"
SURFACE <- "#f1f5f9"; EDGE <- "#cbd5e1"; ERROR <- "#b91c1c"

theme_slate <- function(base = 11) {
  theme_minimal(base_size = base, base_family = "sans") +
    theme(
      plot.title = element_text(color = INK, face = "bold", hjust = 0, size = base + 1),
      plot.subtitle = element_text(color = INK_MUTED, hjust = 0, size = base - 1, margin = margin(b = 8)),
      plot.background = element_rect(fill = "white", color = NA),
      panel.background = element_rect(fill = "white", color = NA),
      panel.grid.major = element_line(color = EDGE, linewidth = 0.3, linetype = "dotted"),
      panel.grid.minor = element_blank(),
      axis.text = element_text(color = INK_MUTED, size = base - 2),
      axis.title = element_text(color = INK_SOFT, size = base - 1),
      axis.line = element_blank(),
      legend.title = element_text(color = INK_SOFT, size = base - 1),
      legend.text = element_text(color = INK_SOFT, size = base - 2)
    )
}
save_plot <- function(p, name, w = 6, h = 4) {
  ggsave(file.path(here, name), plot = p, width = w, height = h, dpi = 144,
         units = "in", device = "png", bg = "white")
  cat("  ", name, "\n", sep = "")
}

set.seed(11)

# ─── sources.json — a stylized source-list with stable shape ─────────────
sources <- list(
  list(id = "s1", title = "The Structure of Scientific Revolutions", author = "Kuhn 1962", domain = "philosophy"),
  list(id = "s2", title = "Personal Knowledge",                      author = "Polanyi 1958", domain = "epistemology"),
  list(id = "s3", title = "Against Method",                          author = "Feyerabend 1975", domain = "philosophy"),
  list(id = "s4", title = "Knowing and the Known",                   author = "Dewey 1949", domain = "pragmatism"),
  list(id = "s5", title = "The Tacit Dimension",                     author = "Polanyi 1966", domain = "epistemology"),
  list(id = "s6", title = "The Aim and Structure of Physical Theory","author" = "Duhem 1914", domain = "philosophy"),
  list(id = "s7", title = "Studies in the Logic of Explanation",     author = "Hempel 1948", domain = "philosophy"),
  list(id = "s8", title = "Two Dogmas of Empiricism",                author = "Quine 1951", domain = "philosophy"),
  list(id = "s9", title = "The Logic of Scientific Discovery",       author = "Popper 1934", domain = "philosophy"),
  list(id = "s10", title = "On the Plurality of Worlds",             author = "Lewis 1986", domain = "metaphysics"),
  list(id = "s11", title = "The Web of Belief",                      author = "Quine & Ullian 1970", domain = "epistemology"),
  list(id = "s12", title = "Word and Object",                        author = "Quine 1960", domain = "philosophy")
)
writeLines(jsonlite_emit <- {
  parts <- vapply(sources, function(s) {
    sprintf('    {"id":"%s","title":"%s","author":"%s","domain":"%s"}',
            s$id, gsub("\"","\\\\\"", s$title), s$author, s$domain)
  }, character(1))
  paste0('{\n  "sources": [\n', paste(parts, collapse = ",\n"), '\n  ]\n}')
}, file.path(here, "sources.json"))
cat("  sources.json\n")

# ─── facts.json + quotes.json ────────────────────────────────────────────
writeLines('{
  "facts": [
    {"source":"s1","claim":"Paradigm shifts are non-cumulative","page":113},
    {"source":"s2","claim":"All knowing is personal commitment","page":51},
    {"source":"s3","claim":"Methodological monism stifles progress","page":18},
    {"source":"s5","claim":"Tacit knowledge precedes explicit articulation","page":4},
    {"source":"s7","claim":"Explanation = derivation from laws","page":248},
    {"source":"s8","claim":"Analytic/synthetic distinction is untenable","page":20},
    {"source":"s9","claim":"Falsifiability is the demarcation criterion","page":40}
  ]
}', file.path(here, "facts.json"))
cat("  facts.json\n")

writeLines('{
  "quotes": [
    {"source":"s1","text":"Successive transition from one paradigm to another via revolution is the usual developmental pattern of mature science.","page":12},
    {"source":"s2","text":"Into every act of knowing there enters a passionate contribution of the person knowing what is being known.","page":48},
    {"source":"s5","text":"We can know more than we can tell.","page":4},
    {"source":"s8","text":"The unit of empirical significance is the whole of science.","page":42},
    {"source":"s9","text":"It must be possible for an empirical scientific system to be refuted by experience.","page":40}
  ]
}', file.path(here, "quotes.json"))
cat("  quotes.json\n")

# ─── synthesis.md ────────────────────────────────────────────────────────
writeLines(c(
  "# Synthesis draft", "",
  "## Thesis",
  "The history of philosophy of science shows a steady erosion of the idea that",
  "scientific knowledge is impersonal, cumulative, and methodologically unified.",
  "From Kuhn's paradigm shifts to Polanyi's tacit knowing to Feyerabend's",
  "methodological pluralism, the literature converges on a portrait of science",
  "as a personal, fallible, situated practice.", "",
  "## Three converging arcs",
  "1. **Discontinuity** — Kuhn establishes that progress is punctuated, not gradual.",
  "2. **Personal involvement** — Polanyi argues knowing is irreducibly first-person.",
  "3. **Falsifiability and revision** — Popper + Quine show scientific claims are",
  "   web-like and locally revisable, not foundationally certain.", "",
  "## Open question",
  "If science is personal and revisable, what distinguishes it from ideology?",
  "Popper's falsifiability remains the strongest demarcation tool."
), file.path(here, "synthesis.md"))
cat("  synthesis.md\n")

# ─── source_domain_breakdown.png — bar chart of sources by domain ────────
domain_df <- data.frame(domain = sapply(sources, `[[`, "domain"))
domain_counts <- as.data.frame(table(domain_df$domain), responseName = "count")
colnames(domain_counts) <- c("domain", "count")
p <- ggplot(domain_counts, aes(reorder(domain, count), count)) +
  geom_col(fill = INK_SOFT, color = INK, width = 0.55, alpha = 0.85) +
  geom_text(aes(label = count), hjust = -0.3, color = INK, size = 3.2) +
  coord_flip() +
  labs(title = "sources by domain",
       subtitle = sprintf("%d sources across %d domains", nrow(domain_df), nrow(domain_counts)),
       x = NULL, y = "count") +
  theme_slate()
save_plot(p, "source_domain_breakdown.png", w = 6, h = 3.5)

# ─── citation_network.png — a small graph linking sources → concepts ────
fact_links <- data.frame(
  from = c("Kuhn","Polanyi","Feyerabend","Polanyi","Hempel","Quine","Popper"),
  to   = c("paradigm","tacit","pluralism","tacit","explanation","holism","falsifiability"),
  stringsAsFactors = FALSE
)
unique_from <- unique(fact_links$from)
unique_to   <- unique(fact_links$to)
n_src <- length(unique_from); n_con <- length(unique_to)
nodes <- data.frame(
  name = c(unique_from, unique_to),
  type = c(rep("source", n_src), rep("concept", n_con)),
  nx   = c(rep(-1, n_src),       rep(1, n_con)),
  ny   = c(seq(1, -1, length.out = n_src), seq(1, -1, length.out = n_con)),
  stringsAsFactors = FALSE
)
pos <- setNames(seq_len(nrow(nodes)), nodes$name)
edges <- data.frame(
  x    = nodes$nx[pos[fact_links$from]],
  y    = nodes$ny[pos[fact_links$from]],
  xend = nodes$nx[pos[fact_links$to]],
  yend = nodes$ny[pos[fact_links$to]]
)

p <- ggplot() +
  geom_segment(data = edges, aes(x, y, xend = xend, yend = yend),
               color = INK_MUTED, linewidth = 0.4) +
  geom_point(data = nodes, aes(nx, ny, fill = type), shape = 21, size = 5,
             color = INK_SOFT, stroke = 0.5) +
  geom_text(data = nodes, aes(nx, ny, label = name),
            hjust = ifelse(nodes$type == "source", 1.15, -0.15),
            color = INK, size = 3.2) +
  scale_fill_manual(values = c(source = INK_SOFT, concept = SURFACE), guide = "none") +
  coord_fixed() + xlim(-2.4, 2.4) + ylim(-1.4, 1.4) +
  labs(title = "facts → concepts (citation map)") +
  theme_slate() + theme(axis.text = element_blank(), axis.title = element_blank(),
                        panel.grid = element_blank())
save_plot(p, "citation_network.png", w = 7, h = 4)

# ─── report.html — final styled output (theme matches) ───────────────────
writeLines(c(
  "<!doctype html><html><head><meta charset='utf-8'>",
  "<title>Research synthesis</title>",
  "<style>",
  "body{font-family:system-ui,sans-serif;max-width:42em;margin:2em auto;padding:0 1em;color:#0f172a}",
  "h1{font-size:1.6em;border-bottom:1px solid #cbd5e1;padding-bottom:.3em}",
  "h2{color:#334155;margin-top:2em}",
  "blockquote{border-left:3px solid #94a3b8;padding-left:.8em;color:#334155;margin:.5em 0}",
  "code{background:#f1f5f9;padding:.1em .3em;border-radius:3px;font-size:.9em}",
  "</style></head><body>",
  "<h1>From paradigms to webs of belief</h1>",
  "<p>The history of philosophy of science shows a steady erosion of the idea",
  "that scientific knowledge is impersonal, cumulative, and methodologically",
  "unified.</p>",
  "<h2>Three converging arcs</h2>",
  "<ol>",
  "  <li><b>Discontinuity</b> — Kuhn establishes that progress is punctuated.</li>",
  "  <li><b>Personal involvement</b> — Polanyi argues knowing is first-person.</li>",
  "  <li><b>Falsifiability and revision</b> — Popper + Quine show scientific claims are web-like.</li>",
  "</ol>",
  "<blockquote>'We can know more than we can tell.' — Polanyi, 1966</blockquote>",
  "<p>Generated by the <code>nested-deps</code> trace.</p>",
  "</body></html>"
), file.path(here, "report.html"))
cat("  report.html\n")

writeLines(c(
  "# Research synthesis", "",
  "Final markdown output of the nested-deps trace.", "",
  "## Thesis",
  "Three independent lines of 20th-century philosophy of science converge on the",
  "claim that scientific knowledge is personal, fallible, and locally revisable.",
  "", "## Sources",
  paste0("- ", sapply(sources, function(s) sprintf("**%s** — %s", s$author, s$title)), collapse = "\n")
), file.path(here, "report.md"))
cat("  report.md\n")

cat("\ndone — fixtures in ", here, "\n", sep = "")
