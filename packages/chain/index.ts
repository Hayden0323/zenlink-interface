import json from './chains.json'

const CHAINS = json as Chain[]

export interface Chain {
  name: string
  chain: string
  icon?: string
  rpc: string[]
  faucets: string[]
  nativeCurrency: NativeCurrency
  infoURL: string
  shortName: string
  chainId: number
  networkId: number
  slip44?: number
  ens?: Ens
  explorers?: Explorer[]
  title?: string
  parent?: Parent
  network?: Network
}

export interface Ens {
  registry: string
}

export interface Explorer {
  name: string
  url: string
  standard: Standard
  icon?: string
}

export enum Standard {
  Eip3091 = 'EIP3091',
  None = 'none',
}

export interface NativeCurrency {
  name: string
  symbol: string
  decimals: number
}

export enum Network {
  Iorachain = 'iorachain',
  Mainnet = 'mainnet',
  Testnet = 'testnet',
}

export interface Parent {
  type: Type
  chain: string
  bridges?: Bridge[]
}

export interface Bridge {
  url: string
}

export enum Type {
  L2 = 'L2',
  Shard = 'shard',
}

export enum EthereumChainId {
  ASTAR = 592,
  MOONRIVER = 1285,
  MOONBEAM = 1284,
}

export enum ChainKey {
  ASTAR = 'astar',
  MOONBEAM = 'moonbeam',
  MOONRIVER = 'moonriver',
}

// ChainId array
export const chainIds = CHAINS.map(chain => chain.chainId)

// Chain Short Name => Chain Id mapping
export const chainShortNameToChainId = Object.fromEntries(
  CHAINS.map((data): [string, number] => [data.shortName, data.chainId]),
)

// Chain Id => Short Name mapping
export const chainShortName = Object.fromEntries(
  CHAINS.map((data): [number, string] => [data.chainId, data.shortName]),
)

// Chain Id => Chain Name mapping
export const chainName = Object.fromEntries(
  CHAINS.map((data): [number, string] => [data.chainId, data.name]),
)

// Chain Id => Chain mapping
export const chains = Object.fromEntries(
  CHAINS.map((data): [number, Chain] => [data.chainId, new Chain(data) as Chain]),
)

export class Chain implements Chain {
  public static from(chainId: number) {
    return chains[chainId]
  }

  public static fromShortName(shortName: string) {
    return chains[chainShortName[shortName]]
  }

  public static fromChainId(chainId: number) {
    return chains[chainId]
  }

  constructor(data: Chain) {
    Object.assign(this, data)
  }

  getTxUrl(txHash: string): string {
    if (!this.explorers)
      return ''
    for (const explorer of this.explorers) {
      if (explorer.standard === Standard.Eip3091)
        return `${explorer.url}/tx/${txHash}`
    }
    return ''
  }

  getBlockUrl(blockHashOrHeight: string): string {
    if (!this.explorers)
      return ''
    for (const explorer of this.explorers) {
      if (explorer.standard === Standard.Eip3091)
        return `${explorer.url}/block/${blockHashOrHeight}`
    }
    return ''
  }

  getTokenUrl(tokenAddress: string): string {
    if (!this.explorers)
      return ''
    for (const explorer of this.explorers) {
      if (explorer.standard === Standard.Eip3091)
        return `${explorer.url}/token/${tokenAddress}`
    }
    return ''
  }

  getAccountUrl(accountAddress: string): string {
    if (!this.explorers)
      return ''
    for (const explorer of this.explorers) {
      if (explorer.standard === Standard.Eip3091)
        return `${explorer.url}/address/${accountAddress}`
    }
    return ''
  }
}

export default chains