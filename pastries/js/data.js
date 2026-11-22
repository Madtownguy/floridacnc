/**
 * Pastries and more! — content tables.
 *
 * To add one of Madison's ideas later:
 * - New treat: add the recipe in TREAT_RECIPES, then add its id to
 *   TREAT_UNLOCK_ORDER (that list is the only unlock order). Draw it
 *   in view.js treatInner().
 * - New topping: add it to TOPPINGS and to each treat's toppings list,
 *   then color it in view.js. Use a level after 5 for an endless extra.
 * - New customer: add it to CUSTOMERS and draw the style in view.js.
 * - New shop item: add it to SHOP. kind is "ingredient", "upgrade", or "decor".
 * - New drink: add it to DRINKS and draw it in view.js drinkInner().
 *   unlockLevel 1 means it is available from the start.
 * - Season length: change SEASON_PLAY_MS below. Nothing else hardcodes the length.
 * Ingredients used in recipes must exist in INGREDIENTS.
 */

export const BAKER = "Madison";
export const BAKER_NAME_LIMIT = 16;

export function cleanBakerName(value) {
  const text = String(value ?? "")
    .replace(/[\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, BAKER_NAME_LIMIT);
  return text || BAKER;
}

/** Round box sticker. A name that already ends in s uses the shorter apostrophe. */
export function bakeryStickerText(value) {
  const name = cleanBakerName(value);
  const possessive = /s$/i.test(name) ? `${name}'` : `${name}'s`;
  return `${possessive} Bakery`;
}

export const STORAGE_KEY = "pastries-and-more-v1";

/**
 * What's New card.
 * Each future update must bump GAME_VERSION and add an UPDATES entry
 * with that same version. The card lists that entry's lines once,
 * the first time the game opens after the version changes.
 */
export const GAME_VERSION = "7";

export const UPDATES = [
  {
    version: "7",
    lines: [
      "Selling Seasons are now 15 minutes!",
    ],
  },
  {
    version: "6",
    lines: [
      "The game is easier to follow now!",
    ],
  },
  {
    version: "5",
    lines: [
      "📝 Change your name at the start of each Selling Season!",
    ],
  },
  {
    version: "4",
    lines: [
      "🎉 Custom Orders come way more often now!",
    ],
  },
  {
    version: "3",
    lines: [
      "💒 Wedding cakes and 🛌 Sleepover cakes in Custom Orders!",
    ],
  },
  {
    version: "2",
    lines: [
      "🎉 Custom Orders! Decorate cakes for parties!",
    ],
  },
  {
    version: "1",
    lines: [
      "🍵 Matcha is here!",
      "🥞 Fluffy Pancakes with syrup, butter, berries or marshmallows",
      "🎀 Pick a ribbon color for your Orders boxes",
      "🏷️ Your bakery sticker goes on every box",
    ],
  },
];

export function currentUpdate() {
  return UPDATES.find((item) => item.version === GAME_VERSION) || null;
}

/**
 * How long one Selling Season lasts, in milliseconds of active play.
 * This is the only place to change the season length.
 *
 * The clock runs while Madison is baking or shopping with the page open.
 * It pauses when the game is closed, paused, or sitting on the home screen.
 * Minutes already played are saved in localStorage, so short visits add up.
 *
 *   15 * 60 * 1000   fifteen minutes (Madison's season)
 *   20 * 60 * 1000   twenty minutes
 *   25 * 60 * 1000   twenty-five minutes
 *   35 * 60 * 1000   thirty-five minutes
 */
export const SEASON_PLAY_MS = 15 * 60 * 1000;

/**
 * Coins added on top of her balance when a Selling Season begins.
 * This does not replace the coins she already has.
 * Change this number to change the bonus.
 */
export const SEASON_START_BONUS = 30;

export const INGREDIENTS = [
  { id: "flour", name: "Flour", emoji: "🌾" },
  { id: "sugar", name: "Sugar", emoji: "🍬" },
  { id: "butter", name: "Butter", emoji: "🧈" },
  { id: "eggs", name: "Eggs", emoji: "🥚" },
  { id: "milk", name: "Milk", emoji: "🥛" },
  { id: "fruit", name: "Fruit", emoji: "🍓" },
  { id: "chocolate", name: "Chocolate", emoji: "🍫" },
  { id: "sprinkles", name: "Sprinkles", emoji: "✨" },
  { id: "matcha", name: "Matcha", emoji: "🍵" },
];

/**
 * Which treats each level unlocks. This is the only unlock order.
 * Level 1 is the first row (already in the bakery). Each later row is
 * the new treat for that level. Add a row to unlock another treat,
 * and add the matching recipe in TREAT_RECIPES.
 */
export const TREAT_UNLOCK_ORDER = [
  ["cupcake", "cookie", "pancakes"],
  ["donut"],
  ["pie"],
  ["cake"],
  ["flan"],
];

const TREAT_RECIPES = {
  cupcake: {
    name: "Cupcake",
    plural: "cupcakes",
    price: 8,
    needs: { flour: 1, sugar: 1, butter: 1 },
    toppings: ["plain", "strawberry", "chocolate", "sprinkles", "marshmallow", "honey", "lemon", "coconut"],
  },
  cookie: {
    name: "Cookie",
    plural: "cookies",
    price: 7,
    needs: { flour: 1, sugar: 1, chocolate: 1 },
    toppings: ["plain", "chocolate", "sprinkles", "marshmallow", "coconut"],
  },
  donut: {
    name: "Donut",
    plural: "donuts",
    price: 9,
    needs: { flour: 1, sugar: 1, butter: 1 },
    toppings: ["plain", "strawberry", "chocolate", "sprinkles", "marshmallow", "caramel", "honey", "lemon", "coconut"],
  },
  pie: {
    name: "Pie",
    plural: "pies",
    price: 11,
    needs: { flour: 1, butter: 1, fruit: 1, sugar: 1 },
    toppings: ["plain", "strawberry", "blueberry", "cream", "lemon"],
  },
  cake: {
    name: "Cake",
    plural: "cakes",
    price: 15,
    needs: { flour: 2, sugar: 1, eggs: 1, butter: 1 },
    toppings: ["plain", "strawberry", "chocolate", "blueberry", "sprinkles", "marshmallow", "honey", "lemon", "coconut"],
  },
  flan: {
    name: "Flan",
    plural: "flans",
    price: 12,
    needs: { eggs: 1, milk: 1, sugar: 1 },
    toppings: ["plain", "caramel", "cream", "honey"],
  },
  pancakes: {
    name: "Fluffy Pancakes",
    single: "stack of fluffy pancakes",
    plural: "stacks of fluffy pancakes",
    price: 9,
    needs: { flour: 1, eggs: 1, milk: 1 },
    toppings: ["syrup", "butter", "berries", "marshmallow"],
  },
};

function treatUnlockLevel(id) {
  const index = TREAT_UNLOCK_ORDER.findIndex((group) => group.includes(id));
  if (index === -1) throw new Error(`Add ${id} to TREAT_UNLOCK_ORDER`);
  return index + 1;
}

export const TREATS = TREAT_UNLOCK_ORDER.flat().map((id) => {
  const recipe = TREAT_RECIPES[id];
  if (!recipe) throw new Error(`Add a recipe for ${id}`);
  return { id, ...recipe, unlockLevel: treatUnlockLevel(id) };
});

export const TOPPINGS = [
  { id: "plain", name: "Vanilla", phrase: "vanilla", unlockLevel: 1, needs: {}, priceAdd: 0 },
  { id: "strawberry", name: "Strawberry", phrase: "strawberry", unlockLevel: 1, needs: { fruit: 1 }, priceAdd: 2 },
  { id: "chocolate", name: "Chocolate", phrase: "chocolate", unlockLevel: 1, needs: { chocolate: 1 }, priceAdd: 2 },
  { id: "sprinkles", name: "Sprinkles", phrase: "sprinkles", unlockLevel: 1, needs: { sprinkles: 1 }, priceAdd: 2 },
  { id: "syrup", name: "Syrup", phrase: "syrup", unlockLevel: 1, needs: { sugar: 1 }, priceAdd: 2 },
  { id: "butter", name: "Butter", phrase: "butter", unlockLevel: 1, needs: { butter: 1 }, priceAdd: 2 },
  { id: "berries", name: "Berries", phrase: "berries", unlockLevel: 1, needs: { fruit: 1 }, priceAdd: 2 },
  { id: "marshmallow", name: "Marshmallow", phrase: "marshmallow", unlockLevel: 1, needs: { sugar: 1 }, priceAdd: 2 },
  { id: "caramel", name: "Caramel", phrase: "caramel", unlockLevel: 2, needs: { sugar: 1 }, priceAdd: 2 },
  { id: "blueberry", name: "Blueberry", phrase: "blueberry", unlockLevel: 3, needs: { fruit: 1 }, priceAdd: 2 },
  { id: "cream", name: "Cream", phrase: "whipped cream", unlockLevel: 5, needs: { milk: 1 }, priceAdd: 2 },
  // After flan (level 5), more toppings keep arriving.
  { id: "honey", name: "Honey", phrase: "honey", unlockLevel: 6, needs: { sugar: 1 }, priceAdd: 2 },
  { id: "lemon", name: "Lemon", phrase: "lemon", unlockLevel: 7, needs: { fruit: 1 }, priceAdd: 2 },
  { id: "coconut", name: "Coconut", phrase: "coconut", unlockLevel: 8, needs: { sugar: 1 }, priceAdd: 2 },
];

/**
 * Drinks customers can ask for with a treat.
 * unlockLevel 1 means it is on the menu from the start.
 * Raise unlockLevel later to hide a drink until that level.
 * needs uses ingredients from INGREDIENTS. An empty needs list is fine.
 * with is the short phrase used in the customer's sentence.
 */
export const DRINKS = [
  { id: "coffee", name: "Coffee", with: "a coffee", unlockLevel: 1, price: 4, needs: { sugar: 1 } },
  { id: "hot-chocolate", name: "Hot Chocolate", with: "a hot chocolate", unlockLevel: 1, price: 5, needs: { milk: 1, chocolate: 1 } },
  { id: "milk", name: "Milk", with: "milk", unlockLevel: 1, price: 3, needs: { milk: 1 } },
  { id: "chocolate-milk", name: "Chocolate Milk", with: "a chocolate milk", unlockLevel: 1, price: 4, needs: { milk: 1, chocolate: 1 } },
  { id: "matcha", name: "Matcha", with: "a matcha", unlockLevel: 1, price: 5, needs: { matcha: 1 } },
];

/** Pictures she can use as the home-screen logo. kind is "treat" or "drink". */
export const LOGOS = [
  { kind: "treat", id: "cupcake", name: "Cupcake" },
  { kind: "treat", id: "cookie", name: "Cookie" },
  { kind: "treat", id: "donut", name: "Donut" },
  { kind: "treat", id: "pie", name: "Pie" },
  { kind: "treat", id: "cake", name: "Cake" },
  { kind: "treat", id: "flan", name: "Flan" },
  { kind: "treat", id: "pancakes", name: "Fluffy Pancakes" },
  { kind: "drink", id: "coffee", name: "Coffee" },
  { kind: "drink", id: "hot-chocolate", name: "Hot Chocolate" },
  { kind: "drink", id: "milk", name: "Milk" },
  { kind: "drink", id: "chocolate-milk", name: "Chocolate Milk" },
  { kind: "drink", id: "matcha", name: "Matcha" },
];

/** Box decorations. ribbon stays empty until she picks a color.
 *  sticker "bakery" draws the round name sticker.
 *  A saved mail job can set ribbon to one of RIBBONS.
 */
export const BOX_DECOR = { ribbon: null, sticker: "bakery" };

export const RIBBONS = [
  { id: "pink", name: "Pink", color: "#ff8fb8" },
  { id: "red", name: "Red", color: "#e5484d" },
  { id: "blue", name: "Blue", color: "#4c9aff" },
  { id: "purple", name: "Purple", color: "#a78bfa" },
  { id: "gold", name: "Gold", color: "#e8b931" },
];

/** Share of newly rolled Orders that are Custom event cakes.
 *  More than half, and the list keeps one waiting when a roll would leave a gap.
 */
export const CUSTOM_ORDER_CHANCE = 2 / 3;

/** Party cakes in Orders. Each event uses toppings and ribbons already in the game.
 *  Wedding asks for a second ribbon and an extra decoration, and pays a bigger bonus.
 */
export const PARTY_EVENTS = [
  {
    id: "birthday",
    name: "Birthday",
    emoji: "🎂",
    frosting: ["plain", "strawberry", "chocolate", "blueberry", "caramel"],
    toppings: ["sprinkles", "marshmallow", "berries", "chocolate"],
    ribbons: ["pink", "gold", "red", "blue", "purple"],
    notes: {
      full: ["This is just what they hoped for!", "Happy birthday! The cake is perfect!"],
      partial: ["They love the birthday cake you made!"],
      kind: ["They are so glad you baked for their birthday!"],
    },
  },
  {
    id: "graduation",
    name: "Graduation",
    emoji: "🎓",
    frosting: ["chocolate", "blueberry", "plain", "honey"],
    toppings: ["sprinkles", "chocolate", "berries"],
    ribbons: ["blue", "gold", "purple"],
    notes: {
      full: ["They hoped for a cake this proud!", "You did it! What a graduation cake!"],
      partial: ["They love this graduation cake!"],
      kind: ["They are so glad you baked for their graduation!"],
    },
  },
  {
    id: "holiday",
    name: "Holiday",
    emoji: "🎄",
    frosting: ["strawberry", "plain", "chocolate", "honey"],
    toppings: ["sprinkles", "berries", "marshmallow"],
    ribbons: ["red", "gold", "pink"],
    notes: {
      full: ["This is just what they hoped for the holiday!", "The holiday cake is so cheerful!"],
      partial: ["They love the holiday cake you made!"],
      kind: ["They are so glad you baked for their holiday!"],
    },
  },
  {
    id: "wedding",
    name: "Wedding",
    emoji: "💒",
    fancy: true,
    bonus: 16,
    frosting: ["plain", "strawberry", "lemon", "blueberry"],
    toppings: ["sprinkles", "berries", "cream", "coconut"],
    ribbons: ["gold", "pink", "purple", "blue"],
    notes: {
      full: ["What a beautiful wedding cake!", "So fancy! They hoped for a cake like this!"],
      partial: ["They love how fancy you made it!"],
      kind: ["They are so glad you baked for their wedding!"],
    },
  },
  {
    id: "sleepover",
    name: "Sleepover",
    emoji: "🛌",
    frosting: ["plain", "strawberry", "lemon", "blueberry"],
    toppings: ["marshmallow", "sprinkles"],
    ribbons: ["pink", "purple", "blue"],
    notes: {
      full: ["Cozy and perfect for the sleepover!", "They hoped for a cake this snuggly!"],
      partial: ["They love this sleepover cake!"],
      kind: ["They are so glad you baked for their sleepover!"],
    },
  },
];

export const PARTY_FROSTING = ["plain", "strawberry", "chocolate", "caramel", "blueberry", "lemon", "honey"];
export const PARTY_TOPPINGS = ["sprinkles", "marshmallow", "berries", "chocolate", "coconut", "cream"];

/** About one customer in three also asks for a drink, after the first lesson. */
export const DRINK_ORDER_CHANCE = 0.3;

/** When the drink is hot chocolate, how often they also want marshmallows. */
export const COCOA_MARSHMALLOW_CHANCE = 0.5;

/**
 * Drink-making steps, in order. Change this list to change how a drink is made.
 * A step with when: "marshmallow" is used only when the order asks for marshmallows.
 */
export const DRINK_STEPS = {
  coffee: [
    { id: "cup", name: "Cup", hint: "Tap the cup!" },
    { id: "pour-coffee", name: "Pour coffee", hint: "Pour the coffee!" },
  ],
  "hot-chocolate": [
    { id: "mug", name: "Mug", hint: "Tap the mug!" },
    { id: "cocoa", name: "Cocoa", hint: "Add the cocoa!" },
    { id: "hot-milk", name: "Hot milk", hint: "Pour the hot milk!" },
    { id: "stir", name: "Stir", hint: "Stir it!" },
    { id: "marshmallow", name: "Marshmallow", hint: "Add marshmallows!", when: "marshmallow" },
  ],
  milk: [
    { id: "glass", name: "Glass", hint: "Tap the glass!" },
    { id: "pour-milk", name: "Pour milk", hint: "Pour the milk!" },
  ],
  "chocolate-milk": [
    { id: "glass", name: "Glass", hint: "Tap the glass!" },
    { id: "milk", name: "Milk", hint: "Pour the milk!" },
    { id: "chocolate", name: "Chocolate", hint: "Add the chocolate!" },
    { id: "stir", name: "Stir", hint: "Stir it!" },
  ],
  matcha: [
    { id: "matcha-cup", name: "Cup", hint: "Tap the cup!" },
    { id: "matcha-powder", name: "Matcha powder", hint: "Add the matcha powder!" },
    { id: "hot-water", name: "Hot water", hint: "Pour the hot water!" },
    { id: "whisk", name: "Whisk", hint: "Whisk it!" },
    { id: "matcha-milk", name: "Milk", hint: "Add milk if you like!", optional: "milk" },
  ],
};

export const CUSTOMERS = [
  { id: "sunny", name: "Sunny", unlockLevel: 1, patience: 1, payBonus: 0, skin: "#f6c7a4", shirt: "#ff8fb8" },
  { id: "pip", name: "Pip", unlockLevel: 1, patience: 1, payBonus: 0, skin: "#f8d7b8", shirt: "#ffd166" },
  { id: "cam", name: "Cam", unlockLevel: 2, patience: 0.86, payBonus: 1, skin: "#e0ac7a", shirt: "#7dcea0" },
  { id: "nana", name: "Nana June", unlockLevel: 3, patience: 1.28, payBonus: 0, skin: "#f0c9a0", shirt: "#c7b0e6" },
  { id: "rio", name: "Rio", unlockLevel: 4, patience: 1, payBonus: 1, skin: "#8d5a3c", shirt: "#6ec6d4" },
  { id: "mayor", name: "Mayor Mango", unlockLevel: 5, patience: 0.95, payBonus: 2, skin: "#e8b48a", shirt: "#ff9f45" },
];

/** Features that are not a single catalog row. */
export const FEATURES = [
  { level: 4, text: "Today's special bonus" },
  { level: 5, text: "Some orders ask for two" },
  { level: 6, text: "VIP customers" },
];

export const AWNINGS = [
  { id: "pink", name: "Pink stripes", unlockLevel: 1, a: "#ff8fb8", b: "#fff6ee" },
  { id: "mint", name: "Mint stripes", unlockLevel: 6, a: "#63d6b4", b: "#f3fff9" },
  { id: "lavender", name: "Lavender stripes", unlockLevel: 8, a: "#b9a6ff", b: "#f7f4ff" },
  { id: "sunshine", name: "Sunshine stripes", unlockLevel: 10, a: "#ffd15c", b: "#fffbeb" },
  { id: "sky", name: "Sky stripes", unlockLevel: 12, a: "#8ec8ff", b: "#f3f9ff" },
];

export const BADGES = [
  "New Baker",
  "Donut Dabbler",
  "Pie Pro",
  "Cake Celebrator",
  "Flan Fan",
  "Season Star",
  "Treat Collector",
  "Bakery Hero",
  "Treat Wizard",
  "Pastry Legend",
  "Oven Ace",
  "Sweet Champion",
];

export const SHOP = [
  { id: "pack-flour", kind: "ingredient", name: "Flour sack", cost: 6, emoji: "🌾", desc: "Adds 4 flour", gives: { flour: 4 } },
  { id: "pack-sugar", kind: "ingredient", name: "Sugar bag", cost: 6, emoji: "🍬", desc: "Adds 4 sugar", gives: { sugar: 4 } },
  { id: "pack-butter", kind: "ingredient", name: "Butter box", cost: 6, emoji: "🧈", desc: "Adds 4 butter", gives: { butter: 4 } },
  { id: "pack-eggs", kind: "ingredient", name: "Egg carton", cost: 6, emoji: "🥚", desc: "Adds 4 eggs", gives: { eggs: 4 } },
  { id: "pack-milk", kind: "ingredient", name: "Milk bottle", cost: 6, emoji: "🥛", desc: "Adds 4 milk", gives: { milk: 4 } },
  { id: "pack-fruit", kind: "ingredient", name: "Fruit basket", cost: 6, emoji: "🍓", desc: "Adds 4 fruit", gives: { fruit: 4 } },
  { id: "pack-chocolate", kind: "ingredient", name: "Chocolate bar", cost: 6, emoji: "🍫", desc: "Adds 4 chocolate", gives: { chocolate: 4 } },
  { id: "pack-sprinkles", kind: "ingredient", name: "Sprinkle jar", cost: 6, emoji: "✨", desc: "Adds 4 sprinkles", gives: { sprinkles: 4 } },
  { id: "pack-matcha", kind: "ingredient", name: "Matcha tin", cost: 6, emoji: "🍵", desc: "Adds 4 matcha", gives: { matcha: 4 } },
  { id: "cozyOven", kind: "upgrade", name: "Cozy oven", cost: 28, emoji: "🔥", desc: "Customers wait longer" },
  { id: "tipJar", kind: "upgrade", name: "Tip jar", cost: 36, emoji: "🫙", desc: "A little extra on every happy serve" },
  { id: "secondChance", kind: "upgrade", name: "Second-chance bell", cost: 32, emoji: "🔔", desc: "The first mix-up each visit does not rush them" },
  { id: "bunting", kind: "decor", name: "Bunting", cost: 12, emoji: "🚩", desc: "Cute flags under the awning", freeAt: 2 },
  { id: "lights", kind: "decor", name: "String lights", cost: 16, emoji: "✨", desc: "Twinkle lights on the wall", freeAt: 3 },
  { id: "flowers", kind: "decor", name: "Flower pots", cost: 14, emoji: "🌸", desc: "Flowers in the window", freeAt: 4 },
  { id: "star", kind: "decor", name: "Gold star", cost: 20, emoji: "⭐", desc: "A star for the wall", freeAt: 5 },
  { id: "rug", kind: "decor", name: "Cozy rug", cost: 18, emoji: "🧶", desc: "A soft rug by the counter" },
  { id: "chalkboard", kind: "decor", name: "Chalkboard", cost: 15, emoji: "📋", desc: "A little board on the wall" },
];

/** Bakery gets physically bigger at these levels (after a finished season). */
export const BAKERY_GROWTH = [
  { level: 4, id: "shelf", text: "A bigger display shelf" },
  { level: 7, id: "window", text: "A bigger sunny window" },
  { level: 9, id: "counter", text: "A longer counter" },
  { level: 11, id: "nook", text: "A cozy bakery nook" },
];

/** A new decoration when the scripted treats and bakery sizes have all unlocked. */
export const STICKERS = [
  { level: 13, id: "doilies", name: "Heart doilies" },
  { level: 14, id: "jars", name: "Checkered jars" },
  { level: 15, id: "napkins", name: "Mint napkins" },
  { level: 16, id: "plates", name: "Peach plates" },
  { level: 17, id: "mobile", name: "Cloud mobile" },
  { level: 18, id: "canisters", name: "Cocoa canisters" },
  { level: 19, id: "mitts", name: "Pink oven mitts" },
  { level: 20, id: "stools", name: "Blue stools" },
  { level: 21, id: "clock", name: "Sunny clock" },
  { level: 22, id: "banner", name: "Welcome banner" },
  { level: 23, id: "lantern", name: "Soft lantern" },
  { level: 24, id: "teapot", name: "Polka teapot" },
];

/**
 * Background music. Off until she taps a song.
 * To swap in a real file later, add src: "audio/song.mp3".
 * A src is played instead of the matching synth in js/music.js.
 */
export const MUSIC_TRACKS = [
  { id: "midnight-muffins", name: "Midnight Muffins", feel: "Cozy" },
  { id: "cozy-cocoa", name: "Cozy Cocoa", feel: "Warm" },
  { id: "sweet-flan-lullaby", name: "Sweet Flan Lullaby", feel: "Gentle" },
];

export const MUSIC_VOLUMES = [
  { id: "soft", label: "Soft" },
  { id: "medium", label: "Medium" },
  { id: "loud", label: "Loud" },
];

/** First-visit lesson. waitFor means she taps that thing to continue. */
export const TUTORIAL_STEPS = [
  { id: "order", text: "This picture is the order!" },
  { id: "treat", text: "Tap this treat.", waitFor: "treat" },
  { id: "topping", text: "Tap this topping.", waitFor: "topping" },
  { id: "sip", text: "Make the drink. Tap the glass, then pour.", waitFor: "sip" },
  { id: "serve", text: "Tap Serve to get paid!", waitFor: "serve" },
  { id: "clock", text: "This bar is your Selling Season. Drinks are one tap at a time.", cta: "Let's bake!" },
];

export const THANKS = [
  "Yum! Thank you!",
  "It looks perfect!",
  "So yummy!",
  "You are a great baker!",
];
