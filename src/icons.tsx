/* Manna's icon vocabulary, and the only place the icon library is named.
 *
 * Remix Icon rather than Lucide, for one reason that matters here: every symbol
 * ships in both a Line and a Fill weight. A category tile is 20px of glyph
 * inside a tinted square, and at that size a 1.5px outline is a smudge — the
 * filled weight is what makes "Groceries" readable before you read the word.
 * Chrome stays on Line so the furniture never competes with the content.
 *
 * Screens import roles (`IconBack`, `IconAdd`) rather than library names, and
 * category glyphs are addressed by a stable key (`"utensils"`, not
 * `RiRestaurant2Fill`). Those keys are what get written to the database when a
 * category's icon is changed, so they must stay put even if the library behind
 * them is ever swapped — re-point the table below and nothing else moves. */

import {
  type RemixiconComponentType,
  RiAddLine,
  RiAncientGateFill,
  RiAncientGateLine,
  RiArrowLeftDownLine,
  RiArrowLeftRightLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowRightUpLine,
  RiAwardFill,
  RiAwardLine,
  RiBankCard2Fill,
  RiBankCard2Line,
  RiBankFill,
  RiBankLine,
  RiBillFill,
  RiBillLine,
  RiBook2Fill,
  RiBook2Line,
  RiBookOpenFill,
  RiBookOpenLine,
  RiBoxingFill,
  RiBoxingLine,
  RiBreadFill,
  RiBreadLine,
  RiBriefcase4Fill,
  RiBriefcase4Line,
  RiBuilding2Fill,
  RiBuilding2Line,
  RiBus2Fill,
  RiBus2Line,
  RiCake3Fill,
  RiCake3Line,
  RiCalendar2Fill,
  RiCalendar2Line,
  RiCapsuleFill,
  RiCapsuleLine,
  RiCashFill,
  RiCashLine,
  RiCheckboxCircleFill,
  RiCheckboxCircleLine,
  RiCheckLine,
  RiCloseLine,
  RiCloudFill,
  RiCloudLine,
  RiCoinsFill,
  RiCoinsLine,
  RiCommunityFill,
  RiCommunityLine,
  RiCompass3Fill,
  RiCompass3Line,
  RiComputerFill,
  RiComputerLine,
  RiCupFill,
  RiCupLine,
  RiDeleteBack2Line,
  RiDeleteBin6Line,
  RiDice5Fill,
  RiDice5Line,
  RiDropFill,
  RiDropLine,
  RiExchangeFundsFill,
  RiExchangeFundsLine,
  RiFilmFill,
  RiFilmLine,
  RiFireFill,
  RiFireLine,
  RiFootballFill,
  RiFootballLine,
  RiFridgeFill,
  RiFridgeLine,
  RiGamepadFill,
  RiGamepadLine,
  RiGasStationFill,
  RiGasStationLine,
  RiGift2Fill,
  RiGift2Line,
  RiGlobalFill,
  RiGlobalLine,
  RiGoblet2Fill,
  RiGoblet2Line,
  RiGovernmentFill,
  RiGovernmentLine,
  RiGraduationCapFill,
  RiGraduationCapLine,
  RiGridLine,
  RiGroup2Fill,
  RiGroup2Line,
  RiHammerFill,
  RiHammerLine,
  RiHandCoinFill,
  RiHandCoinLine,
  RiHandbagFill,
  RiHandbagLine,
  RiHandHeartFill,
  RiHandHeartLine,
  RiHeadphoneFill,
  RiHeadphoneLine,
  RiHeart3Fill,
  RiHeart3Line,
  RiHeartPulseFill,
  RiHeartPulseLine,
  RiHome5Fill,
  RiHome5Line,
  RiHospitalFill,
  RiHospitalLine,
  RiInformationLine,
  RiKey2Fill,
  RiKey2Line,
  RiLeafFill,
  RiLeafLine,
  RiLightbulbFill,
  RiLightbulbLine,
  RiLineChartFill,
  RiLineChartLine,
  RiMicLine,
  RiMotorbikeFill,
  RiMotorbikeLine,
  RiMusic2Fill,
  RiMusic2Line,
  RiPaletteFill,
  RiPaletteLine,
  RiParkingFill,
  RiParkingLine,
  RiPencilLine,
  RiPencilRuler2Fill,
  RiPencilRuler2Line,
  RiPercentFill,
  RiPercentLine,
  RiPieChart2Fill,
  RiPieChart2Line,
  RiPlaneFill,
  RiPlaneLine,
  RiPriceTag3Fill,
  RiPriceTag3Line,
  RiPuzzle2Fill,
  RiPuzzle2Line,
  RiQuillPenFill,
  RiQuillPenLine,
  RiReceiptFill,
  RiReceiptLine,
  RiRefund2Fill,
  RiRefund2Line,
  RiRestaurant2Fill,
  RiRestaurant2Line,
  RiRoadsterFill,
  RiRoadsterLine,
  RiRocket2Fill,
  RiRocket2Line,
  RiRunFill,
  RiRunLine,
  RiSafe2Fill,
  RiSafe2Line,
  RiScales3Fill,
  RiScales3Line,
  RiScissorsFill,
  RiScissorsLine,
  RiSeedlingFill,
  RiSeedlingLine,
  RiSendPlane2Fill,
  RiSettings4Line,
  RiShirtFill,
  RiShirtLine,
  RiShoppingBasket2Fill,
  RiShoppingBasket2Line,
  RiSignalTowerFill,
  RiSignalTowerLine,
  RiSkipForwardLine,
  RiSmartphoneFill,
  RiSmartphoneLine,
  RiSofaFill,
  RiSofaLine,
  RiSparkling2Fill,
  RiSparkling2Line,
  RiStackFill,
  RiStackLine,
  RiStethoscopeFill,
  RiStethoscopeLine,
  RiStore2Fill,
  RiStore2Line,
  RiSuitcase2Fill,
  RiSuitcase2Line,
  RiTicket2Fill,
  RiTicket2Line,
  RiTimeFill,
  RiTimeLine,
  RiToolsFill,
  RiToolsLine,
  RiToothFill,
  RiToothLine,
  RiTrophyFill,
  RiTrophyLine,
  RiTruckFill,
  RiTruckLine,
  RiTShirt2Fill,
  RiTShirt2Line,
  RiTv2Fill,
  RiTv2Line,
  RiUmbrellaFill,
  RiUmbrellaLine,
  RiWallet3Fill,
  RiWallet3Line,
  RiWalkFill,
  RiWalkLine,
  RiWifiFill,
  RiWifiLine,
  RiWrenchFill,
  RiWrenchLine,
} from "@remixicon/react";

/** Every icon in the app is one of these. Takes `className`, so Tailwind's
 *  `size-*` still governs the drawn size the way it did before. */
export type Icon = RemixiconComponentType;

/* ── Chrome ────────────────────────────────────────────────────────────────
   Furniture: navigation, the actions on a row, the keypad. Line weight
   throughout — these are things you operate, not things you read. */

export const IconBack = RiArrowLeftSLine;
export const IconForward = RiArrowRightSLine;
export const IconClose = RiCloseLine;
export const IconAdd = RiAddLine;
export const IconEdit = RiPencilLine;
export const IconDelete = RiDeleteBin6Line;
export const IconBackspace = RiDeleteBack2Line;
export const IconSettings = RiSettings4Line;
/** "Show me everything" — the escape hatch out of a shortlist into the full set. */
export const IconBrowse = RiGridLine;
export const IconInfo = RiInformationLine;
export const IconApprove = RiCheckLine;
export const IconSkip = RiSkipForwardLine;
export const IconMic = RiMicLine;
export const IconSend = RiSendPlane2Fill;

/** The three kinds of movement, used wherever a transaction's direction has to
 *  read at a glance: the kind toggle, the review panel, list rows, stat tiles.
 *  In and out are diagonals rather than a plain up/down arrow — a diagonal says
 *  "arrived from somewhere" and "left for somewhere", which is the distinction
 *  that matters when a transfer sits in the same list. */
export const IconIn = RiArrowLeftDownLine;
export const IconOut = RiArrowRightUpLine;
export const IconTransfer = RiArrowLeftRightLine;

/** The four sections, each in both weights. The bar fills the tab you are on
 *  and outlines the rest — with five slots and no room for labels to grow, the
 *  weight change carries "you are here" better than colour alone at this size. */
export const NAV_GLYPHS = {
  home: { fill: RiHome5Fill, line: RiHome5Line },
  month: { fill: RiCalendar2Fill, line: RiCalendar2Line },
  plan: { fill: RiCheckboxCircleFill, line: RiCheckboxCircleLine },
  wallets: { fill: RiWallet3Fill, line: RiWallet3Line },
} satisfies Record<string, { fill: Icon; line: Icon }>;

/* ── The category catalogue ────────────────────────────────────────────────
   The set offered when picking a parent category's icon, and the set the
   name-matching fallback draws from. Keys are stored in the database; the
   components either side of them are not.

   Both weights are kept for every entry: a tile uses `fill`, and anywhere a
   glyph sits inline beside text at chrome weight uses `line`. */

interface Glyph {
  label: string;
  fill: Icon;
  line: Icon;
}

const CATALOGUE = {
  // Food & drink
  utensils: { label: "Dining", fill: RiRestaurant2Fill, line: RiRestaurant2Line },
  basket: { label: "Groceries", fill: RiShoppingBasket2Fill, line: RiShoppingBasket2Line },
  coffee: { label: "Coffee", fill: RiCupFill, line: RiCupLine },
  water: { label: "Water", fill: RiDropFill, line: RiDropLine },
  bread: { label: "Bread", fill: RiBreadFill, line: RiBreadLine },
  cake: { label: "Treats", fill: RiCake3Fill, line: RiCake3Line },
  drinks: { label: "Drinks", fill: RiGoblet2Fill, line: RiGoblet2Line },

  // Getting around
  bus: { label: "Fare", fill: RiBus2Fill, line: RiBus2Line },
  car: { label: "Car", fill: RiRoadsterFill, line: RiRoadsterLine },
  motorbike: { label: "Motorbike", fill: RiMotorbikeFill, line: RiMotorbikeLine },
  fuel: { label: "Fuel", fill: RiGasStationFill, line: RiGasStationLine },
  parking: { label: "Parking", fill: RiParkingFill, line: RiParkingLine },
  plane: { label: "Flights", fill: RiPlaneFill, line: RiPlaneLine },
  wrench: { label: "Repair", fill: RiWrenchFill, line: RiWrenchLine },
  walk: { label: "On foot", fill: RiWalkFill, line: RiWalkLine },

  // Home
  house: { label: "Home", fill: RiHome5Fill, line: RiHome5Line },
  bulb: { label: "Electricity", fill: RiLightbulbFill, line: RiLightbulbLine },
  flame: { label: "Gas", fill: RiFireFill, line: RiFireLine },
  sofa: { label: "Furnishing", fill: RiSofaFill, line: RiSofaLine },
  fridge: { label: "Appliances", fill: RiFridgeFill, line: RiFridgeLine },
  tools: { label: "Tools", fill: RiToolsFill, line: RiToolsLine },
  hammer: { label: "Repairs", fill: RiHammerFill, line: RiHammerLine },

  // Communication & tech
  phone: { label: "Phone", fill: RiSmartphoneFill, line: RiSmartphoneLine },
  wifi: { label: "Internet", fill: RiWifiFill, line: RiWifiLine },
  antenna: { label: "Load", fill: RiSignalTowerFill, line: RiSignalTowerLine },
  computer: { label: "Devices", fill: RiComputerFill, line: RiComputerLine },
  cloud: { label: "Software", fill: RiCloudFill, line: RiCloudLine },
  screen: { label: "Streaming", fill: RiTv2Fill, line: RiTv2Line },
  headphones: { label: "Audio", fill: RiHeadphoneFill, line: RiHeadphoneLine },

  // Health & body
  pulse: { label: "Health", fill: RiHeartPulseFill, line: RiHeartPulseLine },
  capsule: { label: "Medicine", fill: RiCapsuleFill, line: RiCapsuleLine },
  stethoscope: { label: "Consultation", fill: RiStethoscopeFill, line: RiStethoscopeLine },
  hospital: { label: "Hospital", fill: RiHospitalFill, line: RiHospitalLine },
  tooth: { label: "Dental", fill: RiToothFill, line: RiToothLine },
  run: { label: "Fitness", fill: RiRunFill, line: RiRunLine },
  boxing: { label: "Sport", fill: RiBoxingFill, line: RiBoxingLine },

  // Personal
  shirt: { label: "Clothing", fill: RiShirtFill, line: RiShirtLine },
  tshirt: { label: "Casual wear", fill: RiTShirt2Fill, line: RiTShirt2Line },
  scissors: { label: "Grooming", fill: RiScissorsFill, line: RiScissorsLine },
  sparkle: { label: "Care", fill: RiSparkling2Fill, line: RiSparkling2Line },
  handbag: { label: "Accessories", fill: RiHandbagFill, line: RiHandbagLine },
  palette: { label: "Hobbies", fill: RiPaletteFill, line: RiPaletteLine },

  // People & giving
  "hand-heart": { label: "Giving", fill: RiHandHeartFill, line: RiHandHeartLine },
  "hand-coin": { label: "Offering", fill: RiHandCoinFill, line: RiHandCoinLine },
  gift: { label: "Gifts", fill: RiGift2Fill, line: RiGift2Line },
  community: { label: "Community", fill: RiCommunityFill, line: RiCommunityLine },
  group: { label: "Family", fill: RiGroup2Fill, line: RiGroup2Line },
  heart: { label: "Care for others", fill: RiHeart3Fill, line: RiHeart3Line },
  gate: { label: "Church", fill: RiAncientGateFill, line: RiAncientGateLine },

  // Learning
  book: { label: "Reading", fill: RiBookOpenFill, line: RiBookOpenLine },
  books: { label: "Books", fill: RiBook2Fill, line: RiBook2Line },
  graduation: { label: "Courses", fill: RiGraduationCapFill, line: RiGraduationCapLine },
  pencil: { label: "Materials", fill: RiPencilRuler2Fill, line: RiPencilRuler2Line },
  quill: { label: "Writing", fill: RiQuillPenFill, line: RiQuillPenLine },

  // Leisure
  ticket: { label: "Entertainment", fill: RiTicket2Fill, line: RiTicket2Line },
  film: { label: "Film", fill: RiFilmFill, line: RiFilmLine },
  game: { label: "Games", fill: RiGamepadFill, line: RiGamepadLine },
  music: { label: "Music", fill: RiMusic2Fill, line: RiMusic2Line },
  dice: { label: "Play", fill: RiDice5Fill, line: RiDice5Line },
  football: { label: "Sports", fill: RiFootballFill, line: RiFootballLine },
  suitcase: { label: "Travel", fill: RiSuitcase2Fill, line: RiSuitcase2Line },
  compass: { label: "Outings", fill: RiCompass3Fill, line: RiCompass3Line },
  puzzle: { label: "Pastimes", fill: RiPuzzle2Fill, line: RiPuzzle2Line },

  // Money
  bank: { label: "Financial", fill: RiBankFill, line: RiBankLine },
  coins: { label: "Coins", fill: RiCoinsFill, line: RiCoinsLine },
  cash: { label: "Cash", fill: RiCashFill, line: RiCashLine },
  wallet: { label: "Wallet", fill: RiWallet3Fill, line: RiWallet3Line },
  card: { label: "Card", fill: RiBankCard2Fill, line: RiBankCard2Line },
  receipt: { label: "Receipt", fill: RiReceiptFill, line: RiReceiptLine },
  bill: { label: "Bills", fill: RiBillFill, line: RiBillLine },
  safe: { label: "Savings", fill: RiSafe2Fill, line: RiSafe2Line },
  scales: { label: "Balance", fill: RiScales3Fill, line: RiScales3Line },
  percent: { label: "Interest", fill: RiPercentFill, line: RiPercentLine },
  government: { label: "Taxes", fill: RiGovernmentFill, line: RiGovernmentLine },
  umbrella: { label: "Insurance", fill: RiUmbrellaFill, line: RiUmbrellaLine },
  exchange: { label: "Investing", fill: RiExchangeFundsFill, line: RiExchangeFundsLine },
  chart: { label: "Returns", fill: RiLineChartFill, line: RiLineChartLine },
  pie: { label: "Portfolio", fill: RiPieChart2Fill, line: RiPieChart2Line },
  refund: { label: "Refunds", fill: RiRefund2Fill, line: RiRefund2Line },

  // Work
  briefcase: { label: "Work", fill: RiBriefcase4Fill, line: RiBriefcase4Line },
  building: { label: "Office", fill: RiBuilding2Fill, line: RiBuilding2Line },
  store: { label: "Business", fill: RiStore2Fill, line: RiStore2Line },
  award: { label: "Bonus", fill: RiAwardFill, line: RiAwardLine },
  trophy: { label: "Achievement", fill: RiTrophyFill, line: RiTrophyLine },
  key: { label: "Licenses", fill: RiKey2Fill, line: RiKey2Line },
  stack: { label: "Assets", fill: RiStackFill, line: RiStackLine },
  seedling: { label: "Growth", fill: RiSeedlingFill, line: RiSeedlingLine },
  rocket: { label: "Ventures", fill: RiRocket2Fill, line: RiRocket2Line },
  globe: { label: "Online", fill: RiGlobalFill, line: RiGlobalLine },
  truck: { label: "Delivery", fill: RiTruckFill, line: RiTruckLine },

  // Anything else
  tag: { label: "Other", fill: RiPriceTag3Fill, line: RiPriceTag3Line },
  clock: { label: "Time", fill: RiTimeFill, line: RiTimeLine },
  leaf: { label: "Simple", fill: RiLeafFill, line: RiLeafLine },
  calendar: { label: "Monthly", fill: RiCalendar2Fill, line: RiCalendar2Line },
} satisfies Record<string, Glyph>;

/** The key stored on a category. Kept as a plain string in the data model —
 *  see `Category.icon` — and narrowed to this only on the way to the screen. */
export type IconName = keyof typeof CATALOGUE;

/** What a category falls back to when nothing matches: deliberately a price tag
 *  rather than a blank, so a row never loses its left-hand shape. */
export const DEFAULT_ICON: IconName = "tag";

/** The picker's layout. Grouped rather than one flat run of ninety squares —
 *  you arrive knowing roughly what you want ("something to do with the house"),
 *  and headings turn that into a short scan instead of a search. */
export const ICON_GROUPS: { label: string; names: IconName[] }[] = [
  {
    label: "Food & drink",
    names: ["utensils", "basket", "coffee", "water", "bread", "cake", "drinks"],
  },
  {
    label: "Getting around",
    names: ["bus", "car", "motorbike", "fuel", "parking", "plane", "wrench", "walk"],
  },
  {
    label: "Home",
    names: ["house", "bulb", "flame", "sofa", "fridge", "tools", "hammer"],
  },
  {
    label: "Communication & tech",
    names: ["phone", "wifi", "antenna", "computer", "cloud", "screen", "headphones"],
  },
  {
    label: "Health",
    names: ["pulse", "capsule", "stethoscope", "hospital", "tooth", "run", "boxing"],
  },
  {
    label: "Personal",
    names: ["shirt", "tshirt", "scissors", "sparkle", "handbag", "palette"],
  },
  {
    label: "People & giving",
    names: ["hand-heart", "hand-coin", "gift", "community", "group", "heart", "gate"],
  },
  {
    label: "Learning",
    names: ["book", "books", "graduation", "pencil", "quill"],
  },
  {
    label: "Leisure",
    names: ["ticket", "film", "game", "music", "dice", "football", "suitcase", "compass", "puzzle"],
  },
  {
    label: "Money",
    names: [
      "bank",
      "coins",
      "cash",
      "wallet",
      "card",
      "receipt",
      "bill",
      "safe",
      "scales",
      "percent",
      "government",
      "umbrella",
      "exchange",
      "chart",
      "pie",
      "refund",
    ],
  },
  {
    label: "Work",
    names: [
      "briefcase",
      "building",
      "store",
      "award",
      "trophy",
      "key",
      "stack",
      "seedling",
      "rocket",
      "globe",
      "truck",
    ],
  },
  {
    label: "Anything else",
    names: ["tag", "clock", "leaf", "calendar"],
  },
];

function isIconName(name: string | undefined): name is IconName {
  return name !== undefined && name in CATALOGUE;
}

/** The label shown under a square in the picker. */
export function iconLabel(name: IconName): string {
  return CATALOGUE[name].label;
}

/* Matched against a category's name, and only reached when nothing was stored
   against it — which in practice means subcategories (they inherit their
   parent's stored icon only as a last resort) and spending filed under a
   category that has since been deleted. First hit wins, so the order is the
   rule: narrower phrases sit above the broad money words they contain. */
const MATCHES: [RegExp, IconName][] = [
  [/grocer|market|supplies|sari|palengke/i, "basket"],
  [/coffee|snack|tea|cafe/i, "coffee"],
  [/water refill|drinking water|water bill|water$/i, "water"],
  [/dining|restaurant|eat|meal|food|delivery|takeout/i, "utensils"],
  [/fuel|gas station|petrol|diesel|unleaded/i, "fuel"],
  [/parking|toll/i, "parking"],
  [/maintenance|repair/i, "wrench"],
  [/fare|jeep|bus|tricycle|commut|grab|taxi|transport/i, "bus"],
  [/registration|renewal|plate/i, "receipt"],
  [/rent|rental|housing|lodging/i, "house"],
  [/electric|power|meralco|kuryente/i, "bulb"],
  [/lpg|gasul|propane|cooking gas/i, "flame"],
  [/internet|wifi|fibre|fiber|broadband/i, "wifi"],
  [/load|prepaid|phone plan|postpaid|sim/i, "antenna"],
  [/device|laptop|computer|gadget|hardware/i, "computer"],
  [/software|domain|hosting|subscription|cloud|app/i, "cloud"],
  [/household|furnish|appliance/i, "sofa"],
  [/medicine|pharma|drug|prescription|vitamin/i, "capsule"],
  [/consult|doctor|clinic|check-?up/i, "stethoscope"],
  [/dental|dentist|tooth|teeth/i, "tooth"],
  [/fitness|gym|exercise|workout|sport/i, "run"],
  [/hospital|health|medical/i, "pulse"],
  [/cloth|apparel|shoes|wear|shirt/i, "shirt"],
  [/groom|haircut|salon|barber|beauty|care/i, "scissors"],
  [/tithe/i, "hand-heart"],
  [/offering|donat|charity|alm|sponsor/i, "hand-coin"],
  [/family support|hospitality|relative/i, "group"],
  [/gift|present|regalo/i, "gift"],
  [/giving|church|ministry|fellowship/i, "hand-heart"],
  [/book|read/i, "book"],
  [/course|class|tuition|school|educ|learn|training|seminar/i, "graduation"],
  [/material|stationery|notebook|supply/i, "pencil"],
  [/travel|outing|trip|vacation|tour/i, "suitcase"],
  [/hobby|hobbies|craft|art/i, "palette"],
  [/entertain|movie|cinema|concert|show|stream|game|leisure/i, "ticket"],
  [/interest|fee|charge|penalty/i, "percent"],
  [/tax|bir|government/i, "government"],
  [/insur|premium|coverage/i, "umbrella"],
  [/financ|loan|debt|credit|bank/i, "bank"],
  [/tool|equipment/i, "tools"],
  [/licen|permit|accredit/i, "key"],
  [/work|professional|office/i, "briefcase"],
  [/salary|wage|payroll|sahod|earned|pay$/i, "cash"],
  [/freelance|client|contract|commission/i, "briefcase"],
  [/bonus|13th|incentive|allowance/i, "award"],
  [/overtime|extra hours/i, "clock"],
  [/business|sales|store|shop|resale|resell/i, "store"],
  [/dividend|passive|yield|return/i, "chart"],
  [/saving|emergency fund|reserve|invest/i, "safe"],
  [/refund|reimburse|rebate/i, "refund"],
];

/** The glyph key for a category, resolved in order of authority:
 *
 *  1. `own` — the icon set against this exact category in Settings. A decision
 *     someone made, so nothing guessed may override it.
 *  2. the name — what "Groceries" or "Dental" plainly is.
 *  3. `inherited` — the family's icon, reaching a subcategory only once its own
 *     name has failed to suggest anything.
 *  4. the fallback tag, so a row never loses its left-hand shape.
 *
 *  Both keys are typed loose because they arrive from the database, where a
 *  retired or hand-edited value is always possible; an unrecognised one simply
 *  falls through to the next step rather than throwing. */
export function iconNameFor(
  own: string | undefined,
  name: string | undefined,
  inherited?: string,
): IconName {
  if (isIconName(own)) return own;
  if (name) {
    for (const [pattern, icon] of MATCHES) if (pattern.test(name)) return icon;
  }
  if (isIconName(inherited)) return inherited;
  return DEFAULT_ICON;
}

/** The filled weight, for a glyph sitting in a tinted tile. */
export function iconFor(
  own: string | undefined,
  name: string | undefined,
  inherited?: string,
): Icon {
  return CATALOGUE[iconNameFor(own, name, inherited)].fill;
}

/** Both weights for one key, when a caller needs to choose (the nav bar fills
 *  the active tab and outlines the rest). */
export function glyph(name: IconName): Glyph {
  return CATALOGUE[name];
}

/* ── Wallets ───────────────────────────────────────────────────────────────
   Wallets are free text with no icon field of their own — you type "GCash" or
   "BPI" and the shape follows. Matching on the name keeps that a zero-effort
   affair, and the list is short enough that a wrong guess is cosmetic.

   Order matters here more than usual: "GCash" contains "cash" and "Maribank"
   contains "bank", so the specific services are tested before the generic
   words they happen to spell. */
const WALLET_MATCHES: [RegExp, IconName][] = [
  [/saving|emergency|reserve|vault|ipon/i, "safe"],
  [/gcash|maya|grabpay|shopeepay|paypal|wise|revolut|e-?wallet|digital/i, "wallet"],
  [/bank|bpi|bdo|union|metro|land|security|seabank|tyme|rcbc|china|pnb|eastwest/i, "bank"],
  [/card|credit|debit|visa|master/i, "card"],
  [/cash|pocket|hand|purse|pera/i, "cash"],
];

export function walletIconName(name: string | undefined): IconName {
  if (name) {
    for (const [pattern, icon] of WALLET_MATCHES) if (pattern.test(name)) return icon;
  }
  return "wallet";
}
