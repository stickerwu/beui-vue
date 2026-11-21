/**
 * `tone` picks the chain badge colour from the theme: `primary`, `secondary`, `accent`, `muted`,
 * `destructive`, or `primary/80` / `destructive/80` for the softened variants.
 */
export interface SwapChain { id:string, name:string, symbol:string, tone?:string }
export type SwapTokenSide = 'from'|'to'
export interface SwapToken { id:string, symbol:string, name:string, chainId:string, address?:string, balance?:number, usd?:number, trending?:boolean, popular?:boolean }

export const swapChains: SwapChain[] = [
  {id:'eth',tone:'primary',name:'Ethereum',symbol:'Ξ'}, {id:'sol',tone:'secondary',name:'Solana',symbol:'◎'},
  {id:'base',tone:'accent',name:'Base',symbol:'B'}, {id:'arb',tone:'muted',name:'Arbitrum',symbol:'A'},
  {id:'op',tone:'destructive',name:'Optimism',symbol:'O'}, {id:'poly',tone:'primary/80',name:'Polygon',symbol:'P'},
  {id:'bnb',tone:'secondary',name:'BNB',symbol:'B'}, {id:'avax',tone:'destructive/80',name:'Avalanche',symbol:'A'},
]

export const swapTokens: SwapToken[] = [
  {id:'eth-eth',symbol:'ETH',name:'Ether',chainId:'eth',balance:1.245,usd:3142,popular:true},
  {id:'eth-weth',symbol:'WETH',name:'Wrapped Ether',chainId:'eth',balance:.5,usd:3142,popular:true},
  {id:'eth-usdc',symbol:'USDC',name:'USD Coin',chainId:'eth',balance:4521,usd:1,popular:true},
  {id:'eth-usdt',symbol:'USDT',name:'Tether',chainId:'eth',balance:2100,usd:1,popular:true},
  {id:'eth-dai',symbol:'DAI',name:'Dai Stablecoin',chainId:'eth',balance:800,usd:1,popular:true},
  {id:'eth-wbtc',symbol:'WBTC',name:'Wrapped Bitcoin',chainId:'eth',balance:.04,usd:96000,popular:true},
  {id:'eth-link',symbol:'LINK',name:'ChainLink Token',chainId:'eth',balance:120,usd:22,address:'0x51...86ca',trending:true},
  {id:'eth-aztec',symbol:'AZTEC',name:'AZTEC',chainId:'eth',balance:0,address:'0xa2...62d2',trending:true},
  {id:'eth-cfg',symbol:'CFG',name:'Centrifuge',chainId:'eth',balance:0,address:'0xcc...8a94',trending:true},
  {id:'eth-ondo',symbol:'ONDO',name:'Ondo',chainId:'eth',balance:0,address:'0xfa...9be3',trending:true},
  {id:'sol-sol',symbol:'SOL',name:'Solana',chainId:'sol',balance:12.4,usd:168},
  {id:'sol-usdc',symbol:'USDC',name:'USD Coin',chainId:'sol',balance:985.32,usd:1},
  {id:'base-eth',symbol:'ETH',name:'Ether',chainId:'base',balance:.65,usd:3142},
  {id:'base-usdc',symbol:'USDC',name:'USD Coin',chainId:'base',balance:1200,usd:1},
  {id:'arb-arb',symbol:'ARB',name:'Arbitrum',chainId:'arb',balance:800,usd:.95},
  {id:'arb-eth',symbol:'ETH',name:'Ether',chainId:'arb',balance:.32,usd:3142},
  {id:'op-op',symbol:'OP',name:'Optimism',chainId:'op',balance:450,usd:2.8},
  {id:'poly-matic',symbol:'MATIC',name:'Polygon',chainId:'poly',balance:1500,usd:.75},
  {id:'bnb-bnb',symbol:'BNB',name:'BNB',chainId:'bnb',balance:0,usd:620},
  {id:'avax-avax',symbol:'AVAX',name:'Avalanche',chainId:'avax',balance:0,usd:38},
]

export function isValidAddress(value: string) {
  if (/^0x[0-9a-fA-F]{40}$/.test(value)) return true
  return /\.(eth|sol|bnb)$/.test(value) && value.length > 5
}

export function truncateAddress(value: string) {
  return value.startsWith('0x') && value.length === 42 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value
}

export function sanitizeAmount(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, '')
  const parts = cleaned.split('.')
  return parts.length <= 1 ? cleaned : `${parts[0]}.${parts.slice(1).join('')}`
}

export function formatAmount(value: number, max = 6) {
  if (!Number.isFinite(value) || value === 0) return '0'
  return value.toLocaleString(undefined, { maximumFractionDigits: value >= 1000 ? 2 : max })
}
