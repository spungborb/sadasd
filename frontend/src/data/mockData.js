const RANKS = [
  'Iron 1', 'Iron 2', 'Iron 3',
  'Bronze 1', 'Bronze 2', 'Bronze 3',
  'Silver 1', 'Silver 2', 'Silver 3',
  'Gold 1', 'Gold 2', 'Gold 3',
  'Platinum 1', 'Platinum 2', 'Platinum 3',
  'Diamond 1', 'Diamond 2', 'Diamond 3',
  'Ascendant 1', 'Ascendant 2', 'Ascendant 3',
  'Immortal 1', 'Immortal 2', 'Immortal 3',
  'Radiant'
];

const REGIONS = ['EU', 'NA', 'AP', 'KR', 'BR', 'LATAM'];
const ORIGINS = ['personal', 'brute', 'resale', 'autoreg'];

const SKIN_TIERS = ['Select', 'Deluxe', 'Premium', 'Ultra', 'Exclusive'];
const SKIN_COLLECTIONS = [
  { name: 'Phantom', skins: ['Spectrum', 'Oni', 'Ion', 'Recon', 'RGX 11z Pro', 'Champions 2022', 'Singularity', 'Valorant GO! Vol.2'] },
  { name: 'Vandal', skins: ['Prime', 'Reaver', 'Elderflame', 'Sentinels of Light', 'RGX 11z Pro', 'Champions 2021', 'Glitchpop', 'Araxys'] },
  { name: 'Operator', skins: ['Ion', 'Prime', 'Elderflame', 'Origin', 'Gravitational Uranium Neuroblaster', 'Sentinels of Light'] },
  { name: 'Knife', skins: ['RGX 11z Pro Blade', 'Prime Axe', 'Reaver Karambit', 'Oni Claw', 'Champions 2022 Butterfly', 'Glitchpop Dagger', 'Araxys Tail Blade'] },
  { name: 'Sheriff', skins: ['Reaver', 'Ion', 'Magepunk', 'Ruination', 'Spectrum', 'Glitchpop'] },
  { name: 'Classic', skins: ['Recon', 'Prime', 'BlastX', 'RGX 11z Pro', 'Magepunk'] },
  { name: 'Spectre', skins: ['Oni', 'Singularity', 'Ion', 'Glitchpop', 'Ruination'] },
  { name: 'Judge', skins: ['BlastX', 'Magepunk', 'Spectrum', 'Glitchpop'] },
];

const SELLER_NOTES = [
  'Account comes with full email access. Changed password and email before selling. All skins are legit purchased.',
  'High-tier Valorant account with rare skins. Never been banned or flagged. Clean history.',
  'Personal account, sold due to switching platforms. All purchases verified. Email fully changeable.',
  'Top-tier competitive account. All ranked rewards included. No botting or third-party tools used.',
  'Rare limited edition skins collection. Champions bundle + several battle pass exclusives included.',
  'Account has been inactive for 3 months. All credentials provided. Email + password changeable on first login.',
  'Freshly ranked account with premium skins. No penalties or restrictions. Full ownership transfer guaranteed.',
  'Selling because I quit the game. Has been my main since beta. Many exclusive beta skins.',
  'Clean account with zero reports. All agents unlocked. Multiple gun buddies and player cards.',
  'Competitive-ready account. Solid match history in ranked. No smurfing or boosting flags.',
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSkins(count) {
  const skins = [];
  const usedCombos = new Set();
  for (let i = 0; i < count; i++) {
    const collection = randomPick(SKIN_COLLECTIONS);
    const skinName = randomPick(collection.skins);
    const combo = `${collection.name}-${skinName}`;
    if (usedCombos.has(combo)) continue;
    usedCombos.add(combo);
    skins.push({
      weapon: collection.name,
      skin_name: skinName,
      tier: randomPick(SKIN_TIERS),
      icon_url: null,
    });
  }
  return skins;
}

function generateLastActive() {
  const daysAgo = randomInt(0, 120);
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

function generatePrice(rank) {
  const rankIdx = RANKS.indexOf(rank);
  const base = 5 + rankIdx * 3;
  const skinMultiplier = 1 + Math.random() * 0.5;
  return parseFloat((base * skinMultiplier + randomInt(2, 30)).toFixed(2));
}

function generateAccount(id) {
  const rank = randomPick(RANKS);
  const skinCount = randomInt(3, 18);
  const skins = generateSkins(skinCount);
  const banStatus = Math.random() < 0.1;
  const price = generatePrice(rank);
  const region = randomPick(REGIONS);
  const origin = randomPick(ORIGINS);

  return {
    item_id: 100000 + id,
    title: `Valorant ${rank} Account #${100000 + id}`,
    price,
    currency: 'USD',
    origin,
    region,
    category: 'valorant',
    publish_date: generateLastActive(),
    seller: {
      username: `seller_${randomInt(1000, 9999)}`,
      rating: (3.5 + Math.random() * 1.5).toFixed(1),
      sales_count: randomInt(5, 500),
    },
    seller_notes: randomPick(SELLER_NOTES),
    account_details: {
      rank,
      level: randomInt(20, 500),
      vp_count: randomInt(0, 5000),
      rp_count: randomInt(0, 100),
      skins,
      agents_unlocked: randomInt(10, 24),
      last_active: generateLastActive(),
      ban_status: banStatus,
      total_matches: randomInt(100, 5000),
      win_rate: (45 + Math.random() * 20).toFixed(1),
    },
  };
}

let cachedAccounts = null;

export function fetchLztProducts() {
  if (cachedAccounts) return cachedAccounts;
  const accounts = [];
  for (let i = 0; i < 28; i++) {
    accounts.push(generateAccount(i));
  }
  cachedAccounts = accounts;
  return accounts;
}

export function getRankTier(rank) {
  const idx = RANKS.indexOf(rank);
  if (idx < 3) return 'iron';
  if (idx < 6) return 'bronze';
  if (idx < 9) return 'silver';
  if (idx < 12) return 'gold';
  if (idx < 15) return 'platinum';
  if (idx < 18) return 'diamond';
  if (idx < 21) return 'ascendant';
  if (idx < 24) return 'immortal';
  return 'radiant';
}

export function getRankColor(rank) {
  const tier = getRankTier(rank);
  const colors = {
    iron: '#8c8c8c',
    bronze: '#b87333',
    silver: '#c0c0c0',
    gold: '#ffd700',
    platinum: '#00bcd4',
    diamond: '#b388ff',
    ascendant: '#00e676',
    immortal: '#ff4655',
    radiant: '#ffe57f',
  };
  return colors[tier] || '#a1a1aa';
}

export function getOriginLabel(origin) {
  const labels = {
    personal: 'Personal',
    brute: 'Brute',
    resale: 'Resale',
    autoreg: 'Auto-Reg',
  };
  return labels[origin] || origin;
}

export function getOriginColor(origin) {
  const colors = {
    personal: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    brute: 'bg-red-500/20 text-red-400 border-red-500/30',
    resale: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    autoreg: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  };
  return colors[origin] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
}

export { RANKS, REGIONS };
