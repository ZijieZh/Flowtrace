#!/usr/bin/env Rscript
# Dream-analysis fixtures via ggplot2, themed to the slate palette.
# Produces conceptual diagrams (Jungian polarity, Freudian chain, motif heatmap)
# and two distinct "dream imagery" abstracts so the rerun has visibly different bytes.

suppressPackageStartupMessages({
  library(ggplot2)
  library(scales)
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

INK       <- "#0f172a"; INK_SOFT  <- "#334155"; INK_MUTED <- "#94a3b8"
SURFACE   <- "#f1f5f9"; EDGE      <- "#cbd5e1"
ERROR     <- "#b91c1c"; ACCENT_A  <- "#1e293b"; ACCENT_B  <- "#64748b"

theme_slate <- function(base = 11) {
  theme_minimal(base_size = base, base_family = "sans") +
    theme(
      plot.title       = element_text(color = INK,      face = "bold", hjust = 0, size = base + 1),
      plot.subtitle    = element_text(color = INK_MUTED, hjust = 0, size = base - 1, margin = margin(b = 8)),
      plot.background  = element_rect(fill = "white", color = NA),
      panel.background = element_rect(fill = "white", color = NA),
      panel.grid.major = element_line(color = EDGE, linewidth = 0.3, linetype = "dotted"),
      panel.grid.minor = element_blank(),
      axis.text        = element_text(color = INK_MUTED, size = base - 2),
      axis.title       = element_text(color = INK_SOFT,  size = base - 1),
      axis.ticks       = element_line(color = EDGE, linewidth = 0.3),
      axis.line        = element_blank(),
      legend.title     = element_text(color = INK_SOFT,  size = base - 1),
      legend.text      = element_text(color = INK_SOFT,  size = base - 2),
      legend.key       = element_blank()
    )
}
save_plot <- function(p, name, w = 6, h = 4) {
  ggsave(file.path(here, name), plot = p, width = w, height = h, dpi = 144,
         units = "in", device = "png", bg = "white")
  cat("  ", name, "\n", sep = "")
}

# Helper to draw a filled circle.
circle <- function(cx, cy, r, n = 80) {
  ang <- seq(0, 2 * pi, length.out = n)
  data.frame(x = cx + r * cos(ang), y = cy + r * sin(ang))
}

# ─── jung-shadow-anima.png ────────────────────────────────────────────────
left  <- transform(circle(-1.0, 0, 1.3),  grp = "shadow")
right <- transform(circle( 1.0, 0, 1.3),  grp = "anima")
p <- ggplot() +
  geom_polygon(data = left,  aes(x, y, fill = grp), alpha = 0.40, color = INK,      linewidth = 0.6) +
  geom_polygon(data = right, aes(x, y, fill = grp), alpha = 0.40, color = INK_SOFT, linewidth = 0.6) +
  scale_fill_manual(values = c(shadow = SURFACE, anima = "#e2e8f0"), guide = "none") +
  annotate("text", x = -1.5, y =  0.7, label = "shadow",   color = INK,       fontface = "bold", size = 5, hjust = 0) +
  annotate("text", x = -1.5, y =  0.3, label = "unowned",  color = INK_MUTED, size = 3, hjust = 0) +
  annotate("text", x = -1.5, y =  0.0, label = "rejected", color = INK_MUTED, size = 3, hjust = 0) +
  annotate("text", x =  0.6, y =  0.7, label = "anima",    color = INK_SOFT,  fontface = "bold", size = 5, hjust = 0) +
  annotate("text", x =  0.6, y =  0.3, label = "contra-",  color = INK_MUTED, size = 3, hjust = 0) +
  annotate("text", x =  0.6, y =  0.0, label = "sexual",   color = INK_MUTED, size = 3, hjust = 0) +
  annotate("segment", x = -0.2, xend = 0.2, y = -0.4, yend = -0.4, color = INK,
           linewidth = 0.7, arrow = arrow(ends = "both", length = unit(0.18, "cm"))) +
  annotate("text", x = 0, y = -0.7, label = "integration", color = INK, fontface = "italic", size = 3.5) +
  coord_fixed() + xlim(-3.5, 3.5) + ylim(-2, 2) +
  labs(title = "Jungian polarity — shadow ↔ anima") +
  theme_slate() + theme(axis.text = element_blank(), axis.title = element_blank(),
                        panel.grid = element_blank())
save_plot(p, "jung-shadow-anima.png", w = 5.5, h = 4)

# ─── freud-displacement.png ───────────────────────────────────────────────
boxes <- data.frame(
  x = c(0, 1.5, 3.0),
  label = c("latent\ndesire", "censorship", "manifest\ncontent"),
  color = c(INK, ERROR, INK_SOFT)
)
p <- ggplot() +
  geom_rect(data = boxes,
            aes(xmin = x - 0.42, xmax = x + 0.42, ymin = -0.42, ymax = 0.42, color = color),
            fill = "white", linewidth = 0.6) +
  geom_text(data = boxes, aes(x, 0, label = label, color = color),
            fontface = "bold", size = 4) +
  annotate("segment", x = 0.45, xend = 1.05, y = 0, yend = 0, color = INK,
           linewidth = 0.6, arrow = arrow(length = unit(0.18, "cm"))) +
  annotate("segment", x = 1.95, xend = 2.55, y = 0, yend = 0, color = INK,
           linewidth = 0.6, arrow = arrow(length = unit(0.18, "cm"))) +
  annotate("text", x = 1.5, y = -0.85, label = "(displacement)", color = ERROR,
           fontface = "italic", size = 3.4) +
  scale_color_identity() +
  coord_fixed() + xlim(-0.6, 3.6) + ylim(-1.4, 1.4) +
  labs(title = "Freudian displacement chain") +
  theme_slate() + theme(axis.text = element_blank(), axis.title = element_blank(),
                        panel.grid = element_blank())
save_plot(p, "freud-displacement.png", w = 6, h = 3.5)

# ─── pattern-viz.png — motif × dream heatmap ─────────────────────────────
set.seed(7)
dreams  <- sprintf("d-%02d", 1:14)
symbols <- c("water", "falling", "flight", "chase", "lost", "animal")
m <- expand.grid(symbol = factor(symbols, levels = rev(symbols)),
                 dream  = factor(dreams,  levels = dreams))
m$intensity <- ifelse(runif(nrow(m)) > 0.55,
                       runif(nrow(m), 0.3, 1.0), 0)
p <- ggplot(m, aes(dream, symbol, fill = intensity)) +
  geom_tile(color = "white", linewidth = 0.5) +
  scale_fill_gradient(low = SURFACE, high = INK, limits = c(0, 1), name = NULL) +
  labs(title = "motif occurrence across 14 dreams",
       subtitle = "intensity = stylized strength of the motif", x = NULL, y = NULL) +
  theme_slate() + theme(panel.grid = element_blank(),
                        axis.text.x = element_text(angle = 45, hjust = 1))
save_plot(p, "pattern-viz.png", w = 7, h = 3.4)

# ─── dream-imagery (v1 warm) / dream-imagery-alt (cool, alt) / v2 (different) ──
imagery <- function(name, palette, seed) {
  set.seed(seed)
  blobs <- data.frame(
    cx = runif(12, -1, 1),
    cy = runif(12, -1, 1),
    r  = runif(12, 0.25, 0.9),
    color = sample(palette, 12, replace = TRUE)
  )
  pts <- do.call(rbind, lapply(seq_len(nrow(blobs)), function(i) {
    cir <- circle(blobs$cx[i], blobs$cy[i], blobs$r[i])
    cir$group <- i; cir$color <- blobs$color[i]; cir
  }))
  p <- ggplot(pts, aes(x, y, group = group, fill = color)) +
    geom_polygon(alpha = 0.30, color = NA) +
    scale_fill_identity() +
    coord_fixed() + xlim(-2, 2) + ylim(-2, 2) +
    theme_void() + theme(plot.background = element_rect(fill = "white", color = NA))
  ggsave(file.path(here, name), plot = p, width = 4, height = 4, dpi = 144,
         units = "in", device = "png", bg = "white")
  cat("  ", name, "\n", sep = "")
}
imagery("dream-imagery.png",     c(INK, INK_SOFT, ACCENT_A), 11)
imagery("dream-imagery-alt.png", c(INK_MUTED, ACCENT_B, "#475569"), 22)
imagery("dream-imagery-v2.png",  c("#1d4ed8", "#3b82f6", "#60a5fa", "#93c5fd"), 33)

# ─── notes.md + minimal PDF placeholders ─────────────────────────────────
writeLines(c(
  "# Context notes", "",
  "- 14 prior dreams collected (Mar 28 – Apr 11)",
  "- Sleep: 6h avg, fragmented 2–3 wakes/night",
  "- Recent stressor: job change 18 days ago",
  "- Anxiety self-rating: 4/10 (14-day average)", "",
  "## Recurring motifs (frequency ≥ 0.4)",
  "- water (0.50)",
  "- falling (0.43)",
  "- transformation (0.36)"
), file.path(here, "notes.md"))
cat("  notes.md\n")

pdf_v1 <- c(
  "%PDF-1.4", "%âãÏÓ",
  "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
  "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
  "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<<>>>>endobj",
  "4 0 obj<</Length 56>>stream",
  "BT /F1 12 Tf 72 720 Td (Dream report v1) Tj ET",
  "endstream endobj",
  "xref", "0 5",
  "0000000000 65535 f ",
  "0000000015 00000 n ",
  "0000000061 00000 n ",
  "0000000113 00000 n ",
  "0000000201 00000 n ",
  "trailer<</Size 5/Root 1 0 R>>",
  "startxref", "303", "%%EOF"
)
writeBin(charToRaw(paste(pdf_v1, collapse = "\n")), file.path(here, "dream_report.pdf"))
pdf_v2 <- sub("Dream report v1", "Dream report v2", pdf_v1, fixed = TRUE)
writeBin(charToRaw(paste(pdf_v2, collapse = "\n")), file.path(here, "dream_report_v2.pdf"))
cat("  dream_report.pdf + dream_report_v2.pdf\n")

cat("\ndone — fixtures in ", here, "\n", sep = "")
