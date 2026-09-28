import fs from "fs";
import path from "path";
import { createCanvas } from "@napi-rs/canvas";

async function generateOgImage() {
  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Modern subtle dark slate gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#0f172a");
  bgGrad.addColorStop(1, "#1e293b");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Decorative subtle ambient glow
  const glowGrad = ctx.createRadialGradient(950, 150, 50, 950, 150, 400);
  glowGrad.addColorStop(0, "rgba(59, 130, 246, 0.25)");
  glowGrad.addColorStop(1, "rgba(15, 23, 42, 0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, width, height);

  // Decorative border
  ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 30, width - 60, height - 60);

  // Brand Icon Box
  ctx.fillStyle = "#2563eb";
  ctx.beginPath();
  ctx.roundRect(80, 80, 80, 80, [20]);
  ctx.fill();

  // Sparkle / Icon representation
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(120, 120, 18, 0, Math.PI * 2);
  ctx.fill();

  // Brand Label
  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("SMART AI UTILITY PLATFORM", 180, 110);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px sans-serif";
  ctx.fillText("Smart AI", 180, 145);

  // Main Headline
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 56px sans-serif";
  ctx.fillText("Everyday Digital Problem Solver", 80, 260);

  // Subheadline
  ctx.fillStyle = "#94a3b8";
  ctx.font = "28px sans-serif";
  ctx.fillText("Understand Screenshots • Remove Backgrounds • Convert & Compress Files", 80, 320);

  // 3 Pill Badges
  const badges = [
    { label: "📸 Screenshot AI (5 Modes)", x: 80, y: 390, width: 330 },
    { label: "🖼️ AI Background Remover", x: 430, y: 390, width: 320 },
    { label: "📄 PDF & Image Converters", x: 770, y: 390, width: 330 },
    { label: "🛡️ Scam & URL Checker", x: 80, y: 460, width: 310 },
    { label: "🔒 Zero Permanent Storage", x: 410, y: 460, width: 330 },
  ];

  for (const b of badges) {
    ctx.fillStyle = "rgba(30, 41, 59, 0.85)";
    ctx.strokeStyle = "rgba(71, 85, 105, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.width, 50, [14]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f1f5f9";
    ctx.font = "500 20px sans-serif";
    ctx.fillText(b.label, b.x + 20, b.y + 32);
  }

  // Footer Tagline
  ctx.fillStyle = "#64748b";
  ctx.font = "20px sans-serif";
  ctx.fillText("Free Online AI Utilities • Fast & Secure • 100% Real Processing", 80, 560);

  const buffer = canvas.toBuffer("image/png");
  const publicDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const outPath = path.join(publicDir, "og-image.png");
  fs.writeFileSync(outPath, buffer);
  console.log(`Generated og-image.png (${buffer.length} bytes) at ${outPath}`);
}

generateOgImage().catch(console.error);
