/** Drawings for treats, customers, and the bakery. Original art, no outside images. */
import { bakeryFeatures, cleanBakerName, currentAwning, hasDecor, unlockedTreats } from "./rules.js";

const INK = "#5c3a32";

function wrap(inner, size, viewBox) {
  return `<svg viewBox="${viewBox}" width="${size}" height="${size}" aria-hidden="true">${inner}</svg>`;
}

function sprinkleDots(y, x0 = 24) {
  const colors = ["#ff5d8f", "#ffd166", "#7bdff2", "#b8f2a0", "#c9b6ff"];
  return colors.map((color, i) => `<circle cx="${x0 + i * 8}" cy="${y + (i % 2) * 4}" r="2.1" fill="${color}"/>`).join("");
}

function frosting(topping, fallback) {
  switch (topping) {
    case "strawberry": return "#ff6f9a";
    case "chocolate": return "#7a4632";
    case "caramel": return "#e08a2c";
    case "blueberry": return "#7d74d6";
    case "cream": return "#fffdf8";
    case "honey": return "#f6c445";
    case "lemon": return "#ffe56a";
    case "coconut": return "#fffdf6";
    case "sprinkles": return "#ffe9f3";
    case "marshmallow": return "#fffaf6";
    default: return fallback;
  }
}

function extras(topping, y) {
  if (topping === "sprinkles") return sprinkleDots(y);
  if (topping === "chocolate") {
    return `<path d="M28 ${y} Q34 ${y + 10} 40 ${y} T52 ${y}" fill="none" stroke="#4a2c22" stroke-width="3" stroke-linecap="round"/>`;
  }
  if (topping === "caramel") {
    return `<path d="M30 ${y} Q40 ${y + 12} 50 ${y}" fill="none" stroke="#c56a12" stroke-width="3" stroke-linecap="round"/>`;
  }
  if (topping === "strawberry") {
    return `<circle cx="40" cy="${y - 2}" r="4" fill="#e23b4a"/><path d="M40 ${y - 6} l2 3 h-4 z" fill="#3caf6a"/>`;
  }
  if (topping === "cream") {
    return `<ellipse cx="52" cy="${y + 2}" rx="8" ry="5" fill="#fff" stroke="${INK}" stroke-width="2"/>`;
  }
  if (topping === "blueberry") {
    return `<circle cx="34" cy="${y}" r="3" fill="#4d458f"/><circle cx="44" cy="${y + 2}" r="3" fill="#5b54a8"/>`;
  }
  if (topping === "honey") {
    return `<path d="M32 ${y} Q40 ${y + 14} 48 ${y}" fill="none" stroke="#e0a106" stroke-width="3" stroke-linecap="round"/>`;
  }
  if (topping === "lemon") {
    return `<circle cx="36" cy="${y}" r="3" fill="#fff3a0" stroke="#d6b431" stroke-width="1"/><circle cx="46" cy="${y + 3}" r="3" fill="#fff3a0" stroke="#d6b431" stroke-width="1"/>`;
  }
  if (topping === "coconut") {
    return `<path d="M30 ${y} l5 -2 M40 ${y + 2} l5 -2 M50 ${y} l5 -2" stroke="#f7f1e6" stroke-width="2" stroke-linecap="round"/>`;
  }
  if (topping === "marshmallow") {
    return puff(34, y, 5) + puff(46, y + 2, 4.5);
  }
  return "";
}

function puff(cx, cy, r) {
  return `<ellipse cx="${cx}" cy="${cy + 1}" rx="${r}" ry="${r * 0.72}" fill="#fff" stroke="${INK}" stroke-width="2"/>
    <ellipse cx="${cx - r * 0.2}" cy="${cy - r * 0.15}" rx="${r * 0.28}" ry="${r * 0.16}" fill="#ffd0e0"/>`;
}

export function treatInner(treatId, toppingId = "plain") {
  const top = toppingId || "plain";
  if (treatId === "cookie") {
    const iced = top !== "plain" && top !== "chocolate";
    return `
      <ellipse cx="40" cy="44" rx="24" ry="22" fill="#e7b36a" stroke="${INK}" stroke-width="3"/>
      <circle cx="30" cy="40" r="3" fill="#6b3e2e"/><circle cx="46" cy="36" r="3.2" fill="#6b3e2e"/>
      <circle cx="40" cy="50" r="2.6" fill="#6b3e2e"/><circle cx="52" cy="48" r="2.4" fill="#6b3e2e"/>
      ${iced ? `<path d="M22 40 Q40 28 58 40" fill="${frosting(top, "#ffd0e2")}" stroke="${INK}" stroke-width="2"/>` : ""}
      ${top === "chocolate" ? `<path d="M20 42 Q40 26 60 42 V48 Q40 38 20 48 Z" fill="#7a4632"/>` : ""}
      ${extras(top, 34)}
    `;
  }
  if (treatId === "donut") {
    const color = frosting(top, "#ff9ec4");
    return `
      <path fill="${color}" stroke="${INK}" stroke-width="3" fill-rule="evenodd"
        d="M40 14 a22 22 0 1 0 0.1 0 Z M40 32 a8 8 0 1 1 -0.1 0 Z"/>
      <path d="M24 34 Q40 26 56 34" fill="none" stroke="#fff" stroke-width="3" opacity="0.7"/>
      ${extras(top, 28)}
    `;
  }
  if (treatId === "cake") {
    const color = frosting(top, "#ff9ec4");
    return `
      <rect x="18" y="48" width="44" height="14" rx="3" fill="#f6d7a8" stroke="${INK}" stroke-width="3"/>
      <rect x="18" y="44" width="44" height="6" fill="#ffb7d0"/>
      <rect x="18" y="32" width="44" height="14" rx="3" fill="#ffe0b8" stroke="${INK}" stroke-width="3"/>
      <path d="M18 34 Q28 26 40 34 T62 34 V40 H18 Z" fill="${color}" stroke="${INK}" stroke-width="3"/>
      <rect x="38" y="18" width="4" height="12" rx="1" fill="#7bdff2" stroke="${INK}" stroke-width="2"/>
      <ellipse cx="40" cy="16" rx="3" ry="4" fill="#ffd166" stroke="${INK}" stroke-width="1.5"/>
      ${extras(top, 30)}
    `;
  }
  if (treatId === "pie") {
    const fill = frosting(top, "#f2b04c");
    return `
      <ellipse cx="40" cy="58" rx="26" ry="8" fill="#d7d3cf"/>
      <path d="M16 46 L22 58 H58 L64 46 Q40 36 16 46 Z" fill="#f3c98a" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="40" cy="46" rx="22" ry="10" fill="${fill}" stroke="${INK}" stroke-width="3"/>
      <path d="M22 46 Q40 40 58 46 M24 50 H56 M30 42 L50 52" fill="none" stroke="#f8e2b8" stroke-width="2"/>
      ${top === "cream" ? `<ellipse cx="40" cy="40" rx="8" ry="4" fill="#fff" stroke="${INK}" stroke-width="2"/>` : ""}
      ${extras(top, 44)}
    `;
  }
  if (treatId === "flan") {
    return `
      <ellipse cx="40" cy="62" rx="26" ry="8" fill="#fff" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="40" cy="58" rx="16" ry="5" fill="#e08a2c"/>
      <path d="M24 50 Q22 32 40 30 Q58 32 56 50 Q48 58 40 58 Q32 58 24 50 Z" fill="#ffd56a" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="40" cy="36" rx="12" ry="5" fill="${top === "chocolate" ? "#7a4632" : "#c56a1a"}"/>
      <ellipse cx="34" cy="40" rx="4" ry="2" fill="#fff" opacity="0.7"/>
      ${top === "cream" ? `<ellipse cx="54" cy="46" rx="7" ry="4" fill="#fff" stroke="${INK}" stroke-width="2"/>` : ""}
      ${top === "caramel" || top === "plain" ? `<path d="M30 34 Q40 42 50 34" fill="none" stroke="#a85610" stroke-width="2"/>` : ""}
      ${extras(top, 32)}
    `;
  }
  const color = frosting(top, "#ff9ec4");
  return `
    <path d="M24 46 L28 68 H52 L56 46 Z" fill="#ff8fb8" stroke="${INK}" stroke-width="3"/>
    <path d="M30 46 V68 M38 46 V68 M46 46 V68" stroke="#fff" stroke-width="2" opacity="0.8"/>
    <ellipse cx="40" cy="46" rx="18" ry="7" fill="#f3c7a1" stroke="${INK}" stroke-width="3"/>
    <circle cx="40" cy="34" r="12" fill="${color}" stroke="${INK}" stroke-width="3"/>
    <circle cx="30" cy="38" r="7" fill="${color}" stroke="${INK}" stroke-width="3"/>
    <circle cx="50" cy="38" r="7" fill="${color}" stroke="${INK}" stroke-width="3"/>
    ${extras(top, 26)}
  `;
}

export function treatSvg(treatId, toppingId = "plain", size = 80) {
  return wrap(treatInner(treatId, toppingId), size, "0 0 80 80");
}

function steam() {
  return `<path d="M30 16 Q33 10 30 6 M40 14 Q43 8 40 4 M50 16 Q53 10 50 6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`;
}

export function drinkInner(drinkId, floatId = null) {
  const puffs = floatId === "marshmallow"
    ? `${puff(30, 36, 5)}${puff(42, 34, 5)}${puff(36, 44, 4)}`
    : "";
  if (drinkId === "hot-chocolate") {
    return `
      <path d="M20 32 H52 Q62 32 62 42 V56 Q62 70 50 70 H28 Q16 70 16 56 V42 Q16 32 20 32 Z" fill="#f3c7b0" stroke="${INK}" stroke-width="3"/>
      <path d="M22 40 H54 V56 Q54 64 46 64 H28 Q22 64 22 56 V40 Z" fill="#7a4632"/>
      <path d="M54 42 H62 Q70 42 70 50 Q70 58 62 58 H54" fill="none" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="38" cy="40" rx="14" ry="4" fill="#5c3424" stroke="${INK}" stroke-width="2"/>
      ${puffs}
      ${steam()}
    `;
  }
  if (drinkId === "milk") {
    return `
      <path d="M26 22 H54 L50 70 H30 Z" fill="#f7fbff" stroke="${INK}" stroke-width="3"/>
      <path d="M28 36 H52 L50 68 H30 Z" fill="#fff"/>
      <path d="M32 28 H48" stroke="#d7ecff" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="40" cy="22" rx="14" ry="5" fill="#fff" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="36" cy="46" rx="4" ry="8" fill="#fff" opacity="0.85"/>
    `;
  }
  if (drinkId === "chocolate-milk") {
    return `
      <path d="M26 22 H54 L50 70 H30 Z" fill="#f6d7b8" stroke="${INK}" stroke-width="3"/>
      <path d="M29 38 H51 L49 68 H31 Z" fill="#c4844a"/>
      <path d="M34 30 Q40 36 46 30" fill="none" stroke="#7a4632" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="40" cy="22" rx="14" ry="5" fill="#e7b98a" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="36" cy="50" rx="4" ry="7" fill="#f3d2a4" opacity="0.7"/>
    `;
  }
  return `
    <path d="M22 34 H50 Q60 34 60 44 V58 Q60 70 48 70 H28 Q16 70 16 58 V44 Q16 34 22 34 Z" fill="#fff" stroke="${INK}" stroke-width="3"/>
    <path d="M22 42 H52 V58 Q52 64 46 64 H26 Q20 64 20 58 V42 Z" fill="#6b3a24"/>
    <ellipse cx="36" cy="42" rx="14" ry="4" fill="#4a2818" stroke="${INK}" stroke-width="2"/>
    <path d="M52 44 H60 Q68 44 68 52 Q68 60 60 60 H52" fill="none" stroke="${INK}" stroke-width="3"/>
    ${steam()}
  `;
}

export function drinkSvg(drinkId, size = 80, floatId = null) {
  return wrap(drinkInner(drinkId, floatId), size, "0 0 80 80");
}

export function sipSvg(stepId, size = 64) {
  const cup = `<path d="M18 28 H46 Q54 28 54 36 V52 Q54 64 42 64 H26 Q14 64 14 52 V36 Q14 28 18 28 Z" fill="#fff" stroke="${INK}" stroke-width="3"/>
    <path d="M46 36 H54 Q62 36 62 44 Q62 52 54 52 H46" fill="none" stroke="${INK}" stroke-width="3"/>`;
  const glass = `<path d="M24 18 H56 L52 66 H28 Z" fill="#f7fbff" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="40" cy="18" rx="16" ry="5" fill="#fff" stroke="${INK}" stroke-width="3"/>`;
  let inner = cup;
  if (stepId === "glass") inner = glass;
  if (stepId === "pour-coffee") {
    inner = `${cup}<path d="M34 8 C34 20 46 18 46 30" fill="none" stroke="#6b3a24" stroke-width="4" stroke-linecap="round"/>
      <path d="M22 42 H48 V54 Q48 60 40 60 Q32 60 32 54 V42 Z" fill="#6b3a24"/>`;
  }
  if (stepId === "mug") inner = cup.replace("#fff", "#f3c7b0");
  if (stepId === "cocoa") {
    inner = `<rect x="22" y="26" width="36" height="32" rx="6" fill="#c4844a" stroke="${INK}" stroke-width="3"/>
      <rect x="28" y="18" width="24" height="12" rx="4" fill="#7a4632" stroke="${INK}" stroke-width="3"/>
      <circle cx="34" cy="42" r="3" fill="#5c3424"/><circle cx="44" cy="46" r="3" fill="#5c3424"/>`;
  }
  if (stepId === "hot-milk" || stepId === "pour-milk" || stepId === "milk") {
    inner = `<path d="M24 26 H44 L48 58 H20 Z" fill="#fff" stroke="${INK}" stroke-width="3"/>
      <path d="M44 32 H58" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      <path d="M50 32 Q62 40 50 50" fill="none" stroke="#d7ecff" stroke-width="4" stroke-linecap="round"/>
      ${stepId === "hot-milk" ? `<path d="M30 16 Q33 10 30 6 M38 14 Q41 8 38 4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>` : ""}`;
  }
  if (stepId === "chocolate") {
    inner = `<rect x="18" y="28" width="44" height="28" rx="4" fill="#7a4632" stroke="${INK}" stroke-width="3"/>
      <path d="M32 28 V56 M46 28 V56 M18 42 H62" stroke="#5c3424" stroke-width="2"/>`;
  }
  if (stepId === "stir") {
    inner = `<ellipse cx="40" cy="58" rx="18" ry="6" fill="#f3c7b0" stroke="${INK}" stroke-width="3"/>
      <path d="M40 54 V16" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="40" cy="14" rx="8" ry="4" fill="#ffd6e4" stroke="${INK}" stroke-width="2"/>`;
  }
  if (stepId === "marshmallow") {
    inner = `${puff(24, 40, 8)}${puff(40, 32, 9)}${puff(52, 44, 7)}`;
  }
  return wrap(inner, size, "0 0 80 80");
}

export function toppingSvg(toppingId, size = 56) {
  if (toppingId === "marshmallow") {
    const inner = `${puff(16, 30, 7)}${puff(30, 24, 8)}${puff(40, 34, 6)}`;
    return wrap(inner, size, "0 0 56 56");
  }
  const color = frosting(toppingId, "#ffe08a");
  const inner = `
    <ellipse cx="28" cy="40" rx="16" ry="10" fill="${color}" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="28" cy="34" rx="10" ry="7" fill="${color}" stroke="${INK}" stroke-width="3"/>
    ${extras(toppingId, 28)}
  `;
  return wrap(inner, size, "0 0 56 56");
}

export function emptyPlateSvg(size = 86) {
  const inner = `
    <ellipse cx="40" cy="50" rx="28" ry="10" fill="#f4efe9" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="40" cy="46" rx="18" ry="6" fill="#fff" stroke="${INK}" stroke-width="2"/>
  `;
  return wrap(inner, size, "0 0 80 80");
}

function face(mood) {
  const happy = mood === "happy";
  const sad = mood === "sad" || mood === "leave";
  const eyes = happy
    ? `<path d="M34 50 Q40 44 46 50" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
       <path d="M54 50 Q60 44 66 50" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`
    : `<circle cx="40" cy="50" r="3.2" fill="${INK}"/><circle cx="60" cy="50" r="3.2" fill="${INK}"/>
       <circle cx="41.2" cy="48.8" r="1.1" fill="#fff"/><circle cx="61.2" cy="48.8" r="1.1" fill="#fff"/>`;
  const mouth = sad
    ? `<path d="M40 68 Q50 60 60 68" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`
    : `<path d="M38 64 Q50 76 62 64" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  const brows = sad
    ? `<path d="M32 42 L44 45" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
       <path d="M68 42 L56 45" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`
    : "";
  return `${brows}${eyes}${mouth}
    <ellipse cx="30" cy="60" rx="5" ry="3" fill="#ffb3c7" opacity="0.85"/>
    <ellipse cx="70" cy="60" rx="5" ry="3" fill="#ffb3c7" opacity="0.85"/>`;
}

export function customerSvg(customer, mood = "neutral") {
  const skin = customer?.skin || "#f6c7a4";
  const shirt = customer?.shirt || "#ff8fb8";
  const id = customer?.id || "sunny";
  let hair = "";
  let extra = "";
  if (id === "sunny") {
    hair = `<circle cx="22" cy="58" r="12" fill="#6b3e2e"/><circle cx="78" cy="58" r="12" fill="#6b3e2e"/>
      <path d="M30 30 Q50 8 70 30 Q60 18 50 22 Q40 18 30 30 Z" fill="#6b3e2e"/>
      <path d="M62 20 l8 -8 l2 8 l8 2 l-8 3 l-1 8 l-6 -6 l-7 2 z" fill="#ff7aa2" stroke="${INK}" stroke-width="1.5"/>`;
  } else if (id === "pip") {
    hair = `<path d="M28 36 Q40 16 46 32 Q52 14 62 30 Q70 20 74 38" fill="#c47b3a" stroke="#c47b3a" stroke-width="6" stroke-linecap="round"/>`;
    extra = `<circle cx="36" cy="58" r="1.2" fill="#c47b3a"/><circle cx="44" cy="62" r="1.2" fill="#c47b3a"/>`;
  } else if (id === "cam") {
    hair = `<path d="M24 40 H76 L70 24 H34 Z" fill="#3d6b4f" stroke="${INK}" stroke-width="3"/>
      <rect x="22" y="36" width="56" height="8" rx="2" fill="#2f5540" stroke="${INK}" stroke-width="2"/>`;
  } else if (id === "nana") {
    hair = `<circle cx="50" cy="24" r="12" fill="#d9dde3" stroke="${INK}" stroke-width="3"/>
      <path d="M26 48 Q50 28 74 48" fill="#eee" stroke="${INK}" stroke-width="3"/>`;
    extra = `<circle cx="36" cy="52" r="8" fill="none" stroke="${INK}" stroke-width="2"/>
      <circle cx="64" cy="52" r="8" fill="none" stroke="${INK}" stroke-width="2"/>
      <path d="M44 52 H56" stroke="${INK}" stroke-width="2"/>`;
  } else if (id === "rio") {
    hair = `<circle cx="24" cy="42" r="10" fill="#2b1b16"/><circle cx="76" cy="42" r="10" fill="#2b1b16"/>
      <circle cx="34" cy="24" r="10" fill="#2b1b16"/><circle cx="66" cy="24" r="10" fill="#2b1b16"/>
      <circle cx="50" cy="18" r="10" fill="#2b1b16"/>`;
  } else if (id === "mayor") {
    extra = `<path d="M30 28 L38 16 H46 L50 24 L54 16 H62 L70 28 Z" fill="#ffd166" stroke="${INK}" stroke-width="2"/>
      <rect x="34" y="86" width="32" height="8" fill="#fff6ee" stroke="${INK}" stroke-width="2"/>`;
    hair = `<path d="M28 44 Q50 30 72 44" fill="#6b4a32"/>`;
  }
  const inner = `
    ${hair}
    <path d="M28 96 Q22 128 30 142 H70 Q78 128 72 96 Q62 108 50 108 Q38 108 28 96 Z" fill="${shirt}" stroke="${INK}" stroke-width="3"/>
    <circle cx="50" cy="54" r="28" fill="${skin}" stroke="${INK}" stroke-width="3"/>
    ${face(mood)}
    ${extra}
  `;
  return `<svg viewBox="0 0 100 150" width="120" height="180" aria-hidden="true">${inner}</svg>`;
}

function miniTreats(level, y, scale) {
  const treats = unlockedTreats(level);
  return treats.map((treat, index) => {
    const x = 188 + index * 34;
    return `<g transform="translate(${x} ${y}) scale(${scale})">${treatInner(treat.id, treat.id === "flan" ? "caramel" : "plain")}</g>`;
  }).join("");
}

export function bakerySvg(state) {
  const awning = currentAwning(state);
  const features = bakeryFeatures(state.level);
  const bunting = hasDecor(state, "bunting");
  const lights = hasDecor(state, "lights");
  const flowers = hasDecor(state, "flowers");
  const star = hasDecor(state, "star");
  const rug = hasDecor(state, "rug");
  const board = hasDecor(state, "chalkboard");
  const windowW = features.bigWindow ? 168 : 124;
  const windowH = features.bigWindow ? 112 : 92;
  const initial = cleanBakerName(state.bakerName).slice(0, 1).toUpperCase();
  const counterY = features.longCounter ? 176 : 190;
  let scallop = "M0 34";
  for (let i = 0; i < 10; i += 1) scallop += ` Q${i * 40 + 20} 50 ${i * 40 + 40} 34`;
  const stripes = Array.from({ length: 10 }, (_, i) =>
    `<rect x="${i * 40}" y="0" width="40" height="36" fill="${i % 2 ? awning.a : awning.b}"/>`).join("");
  const flags = bunting
    ? [70, 110, 150, 190, 230, 270, 310].map((x, i) =>
      `<path d="M${x} 40 L${x + 14} 40 L${x + 7} 58 Z" fill="${["#ff7aa2", "#ffd166", "#7ddebe", "#8ec8ff"][i % 4]}" stroke="${INK}" stroke-width="2"/>`).join("")
      + `<path d="M60 40 H330" stroke="${INK}" stroke-width="2"/>`
    : "";
  const lightDots = lights
    ? [80, 120, 160, 200, 240, 280, 320].map((x, i) =>
      `<circle cx="${x}" cy="${58 + (i % 2) * 6}" r="4" fill="${i % 2 ? "#ffe08a" : "#fff"}" stroke="${INK}" stroke-width="1.5"/>`).join("")
      + `<path d="M70 52 Q200 70 340 52" fill="none" stroke="${INK}" stroke-width="2"/>`
    : "";
  const flowerPots = flowers
    ? `<rect x="48" y="${counterY - 28}" width="16" height="14" rx="2" fill="#e07a5f" stroke="${INK}" stroke-width="2"/>
       <circle cx="52" cy="${counterY - 32}" r="6" fill="#ff7aa2"/><circle cx="62" cy="${counterY - 34}" r="6" fill="#ffd166"/>
       <rect x="78" y="${counterY - 28}" width="16" height="14" rx="2" fill="#e07a5f" stroke="${INK}" stroke-width="2"/>
       <circle cx="86" cy="${counterY - 34}" r="6" fill="#c9b6ff"/>`
    : "";
  const starMark = star
    ? `<path d="M352 78 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1 z" fill="#ffd166" stroke="${INK}" stroke-width="2"/>`
    : "";
  const rugShape = rug
    ? `<ellipse cx="200" cy="${counterY + 48}" rx="70" ry="12" fill="#ffb7d0" stroke="${INK}" stroke-width="3"/>`
    : "";
  const chalk = board
    ? `<rect x="300" y="96" width="70" height="48" rx="6" fill="#3d4a3a" stroke="${INK}" stroke-width="3"/>
       <text x="335" y="124" text-anchor="middle" font-size="12" fill="#f4ffe8" font-family="ui-rounded, sans-serif">Yum!</text>`
    : "";
  const nook = features.nook
    ? `<rect x="332" y="${counterY - 36}" width="28" height="30" rx="6" fill="#c7b0e6" stroke="${INK}" stroke-width="3"/>
       <rect x="326" y="${counterY - 8}" width="40" height="8" rx="2" fill="#8d6a55" stroke="${INK}" stroke-width="2"/>`
    : "";
  const stickers = Array.from({ length: features.stickerCount }, (_, i) => {
    const colors = ["#ff7aa2", "#ffd166", "#7ddebe", "#8ec8ff", "#c9b6ff", "#ffb085"];
    return `<circle cx="${214 + (i % 4) * 16}" cy="${features.bigShelf ? 118 : 132 + Math.floor(i / 4) * 14}" r="5" fill="${colors[i % colors.length]}" stroke="${INK}" stroke-width="1.5"/>`;
  }).join("");
  const shelfY = features.bigShelf ? 78 : 92;
  const secondShelf = features.bigShelf
    ? `<rect x="186" y="124" width="150" height="8" rx="2" fill="#c68642" stroke="${INK}" stroke-width="2"/>${miniTreats(Math.min(state.level, 3), 96, 0.28)}`
    : "";

  return `<svg class="bakery" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="400" height="260" fill="#ffd9b8"/>
    ${stripes}
    <path d="${scallop}" fill="none" stroke="${awning.a}" stroke-width="6" stroke-linecap="round"/>
    ${flags}${lightDots}
    <rect x="36" y="52" width="${windowW}" height="${windowH}" rx="12" fill="#b7e4ff" stroke="${INK}" stroke-width="4"/>
    <path d="M${36 + windowW / 2} 52 V${52 + windowH} M36 ${52 + windowH / 2} H${36 + windowW}" stroke="${INK}" stroke-width="4"/>
    <ellipse cx="78" cy="78" rx="16" ry="8" fill="#fff"/>
    <ellipse cx="96" cy="76" rx="12" ry="7" fill="#fff"/>
    <circle cx="${36 + windowW - 22}" cy="74" r="10" fill="#ffe08a" stroke="${INK}" stroke-width="2"/>
    <rect x="186" y="${shelfY}" width="${features.bigShelf ? 180 : 150}" height="10" rx="3" fill="#c68642" stroke="${INK}" stroke-width="3"/>
    ${miniTreats(state.level, shelfY - 26, 0.34)}
    ${secondShelf}
    ${chalk}${starMark}${stickers}
    <circle cx="360" cy="150" r="16" fill="#fff" stroke="${INK}" stroke-width="3"/>
    <text x="360" y="156" text-anchor="middle" font-size="16" font-weight="700" fill="${INK}" font-family="ui-rounded, sans-serif">${initial}</text>
    <rect x="0" y="${counterY}" width="400" height="${260 - counterY}" fill="#e7b07a"/>
    <rect x="0" y="${counterY}" width="400" height="14" fill="#f3c79a"/>
    ${features.longCounter ? `<rect x="300" y="${counterY - 24}" width="100" height="24" fill="#f3c79a" stroke="${INK}" stroke-width="3"/>` : ""}
    ${flowerPots}${nook}${rugShape}
  </svg>`;
}

export function coinSvg(size = 20) {
  return `<svg class="coin" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="16" cy="16" r="13.5" fill="#f8d56b" stroke="#b47b16" stroke-width="2.5"/>
    <circle cx="16" cy="16" r="9.2" fill="#ffe9a3" stroke="#e2b23a" stroke-width="1.6"/>
    <path d="M16 8.2 l1.7 4.3 4.6.3 -3.5 3 1.1 4.4 L16 17.8 12.1 20.2 13.2 15.8 9.7 12.8 l4.6-.3 z" fill="#f0b429" stroke="#a56b12" stroke-width="0.6"/>
  </svg>`;
}

export function shopSvg(size = 22) {
  return `<svg class="shop-mark" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">
    <rect x="4" y="13" width="24" height="15" rx="2.5" fill="#fff6ee" stroke="#5c3a32" stroke-width="2"/>
    <path d="M3 13 h26 l-2 -6 H5 Z" fill="#ff8fb8" stroke="#5c3a32" stroke-width="2" stroke-linejoin="round"/>
    <rect x="6" y="8" width="4" height="5" fill="#fff6ee"/>
    <rect x="14" y="8" width="4" height="5" fill="#fff6ee"/>
    <rect x="22" y="8" width="4" height="5" fill="#fff6ee"/>
    <rect x="7.5" y="17" width="8" height="6" rx="1" fill="#9fd4ff" stroke="#5c3a32" stroke-width="1.5"/>
    <path d="M11.5 17 v6" stroke="#5c3a32" stroke-width="1.2"/>
    <rect x="18.5" y="18" width="6" height="10" rx="1.2" fill="#f4b89a" stroke="#5c3a32" stroke-width="1.5"/>
    <circle cx="22.6" cy="23.2" r="0.7" fill="#5c3a32"/>
  </svg>`;
}

export function bookSvg(size = 22) {
  return `<svg class="btn-mark" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">
    <path d="M7 6.5 h8.2 c1.6 1.8 1.6 16.2 0 18.3 H7 Z" fill="#fff6ee" stroke="#5c3a32" stroke-width="2" stroke-linejoin="round"/>
    <path d="M25 6.5 h-8.2 c-1.6 1.8 -1.6 16.2 0 18.3 H25 Z" fill="#ffd6e7" stroke="#5c3a32" stroke-width="2" stroke-linejoin="round"/>
    <path d="M16 8.2 v15" stroke="#5c3a32" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M9.2 12 h4.2 M9.2 16 h4.2" stroke="#e7b07a" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
}

export function gearSvg(size = 22) {
  return `<svg class="btn-mark" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">
    <g fill="#ffe9a3" stroke="#5c3a32" stroke-width="1.7" stroke-linejoin="round">
      <rect x="13.2" y="2.5" width="5.6" height="6" rx="1.2"/>
      <rect x="13.2" y="23.5" width="5.6" height="6" rx="1.2"/>
      <rect x="2.5" y="13.2" width="6" height="5.6" rx="1.2"/>
      <rect x="23.5" y="13.2" width="6" height="5.6" rx="1.2"/>
      <rect x="6.2" y="6.2" width="5.2" height="5.2" rx="1.2" transform="rotate(45 8.8 8.8)"/>
      <rect x="20.6" y="6.2" width="5.2" height="5.2" rx="1.2" transform="rotate(45 23.2 8.8)"/>
      <rect x="6.2" y="20.6" width="5.2" height="5.2" rx="1.2" transform="rotate(45 8.8 23.2)"/>
      <rect x="20.6" y="20.6" width="5.2" height="5.2" rx="1.2" transform="rotate(45 23.2 23.2)"/>
    </g>
    <circle cx="16" cy="16" r="6.4" fill="#fff6ee" stroke="#5c3a32" stroke-width="2"/>
    <circle cx="16" cy="16" r="2.5" fill="#ff8fb8" stroke="#5c3a32" stroke-width="1.6"/>
  </svg>`;
}

export function noteSvg(size = 22) {
  return `<svg class="btn-mark" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">
    <ellipse cx="11" cy="23" rx="5" ry="3.6" fill="#c9b6ff" stroke="#5c3a32" stroke-width="2"/>
    <ellipse cx="22.5" cy="20" rx="5" ry="3.6" fill="#ff8fb8" stroke="#5c3a32" stroke-width="2"/>
    <path d="M15.6 23 V8.5 h9.2 V20" fill="none" stroke="#5c3a32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

export function boxSvg(size = 22) {
  return `<svg class="btn-mark" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">
    <path d="M5 12 L16 7 L27 12 L16 17 Z" fill="#ffd6e7" stroke="#5c3a32" stroke-width="2" stroke-linejoin="round"/>
    <path d="M5 12 V23 L16 28 V17 Z" fill="#fff6ee" stroke="#5c3a32" stroke-width="2" stroke-linejoin="round"/>
    <path d="M27 12 V23 L16 28 V17 Z" fill="#ffe9a3" stroke="#5c3a32" stroke-width="2" stroke-linejoin="round"/>
    <path d="M16 17 V28" stroke="#5c3a32" stroke-width="1.5"/>
  </svg>`;
}

export function mailBoxSvg({ packed = 0, closed = false, ribbon = null, sticker = null } = {}, size = 150) {
  const treats = Array.from({ length: Math.min(packed, 3) }, (_, i) => {
    const x = 48 + i * 22;
    return `<circle cx="${x}" cy="78" r="8" fill="${["#ff8fb8", "#ffe08a", "#9fd4ff"][i]}" stroke="#5c3a32" stroke-width="2"/>`;
  }).join("");
  const bow = ribbon ? `<path d="M70 46 C56 34 48 48 70 58 C92 48 84 34 70 46 Z" fill="#ff8fb8" stroke="#5c3a32" stroke-width="2"/>` : "";
  const seal = sticker ? `<circle cx="104" cy="88" r="10" fill="#c9b6ff" stroke="#5c3a32" stroke-width="2"/>` : "";
  const lid = closed
    ? `<path d="M28 70 L70 48 L112 70 L70 92 Z" fill="#ffd6e7" stroke="#5c3a32" stroke-width="3" stroke-linejoin="round"/>`
    : `<path d="M22 58 L70 34 L118 58 L70 78 Z" fill="#ffe9a3" stroke="#5c3a32" stroke-width="3" stroke-linejoin="round"/>`;
  const inner = `
    <path d="M28 72 L70 92 L70 128 L28 108 Z" fill="#fff6ee" stroke="#5c3a32" stroke-width="3"/>
    <path d="M112 72 L70 92 L70 128 L112 108 Z" fill="#ffe9c4" stroke="#5c3a32" stroke-width="3"/>
    ${closed ? "" : treats}
    ${lid}
    ${bow}
    ${seal}
  `;
  return wrap(inner, size, "0 0 140 140");
}

export function hintHandSvg() {
  return `<svg class="hint-pointer" viewBox="0 0 70 88" width="64" height="80" aria-hidden="true">
    <g fill="#f6c7a4" fill-opacity="0.78" stroke="#5c3a32" stroke-width="3" stroke-linejoin="round">
      <ellipse cx="36" cy="24" rx="18" ry="14"/>
      <rect x="27" y="30" width="18" height="46" rx="9"/>
      <ellipse cx="16" cy="40" rx="8" ry="11" transform="rotate(-30 16 40)"/>
    </g>
    <ellipse cx="36" cy="70" rx="5" ry="3.5" fill="#fff" fill-opacity="0.7"/>
  </svg>`;
}
