import { getAddress } from '@ethersproject/address'

export interface ZenlinkProtocolPrimitivesAssetId {
  chainId: number
  assetType: number
  assetIndex: number
}

// shorten the checksummed version of the input address to have 0x + 4 characters at start and end
export function shortenAddress(address: string, characters = 4): string {
  try {
    const parsed = getAddress(address)
    return `${parsed.substring(0, characters + 2)}...${parsed.substring(42 - characters)}`
  }
  catch (error) {
    throw new Error(`Invalid 'address' parameter '${address}'.`)
  }
}

export function isZenlinkAddress(address: string): boolean {
  return /\d+(-\d+)(-\d+)/.test(address)
}

export function addressToZenlinkAssetId(address: string): ZenlinkProtocolPrimitivesAssetId {
  if (!isZenlinkAddress(address))
    throw new Error('invalid address')
  const [chainId, assetType, assetIndex] = address.split('-')
  return {
    chainId: Number(chainId),
    assetType: Number(assetType),
    assetIndex: Number(assetIndex),
  }
}
