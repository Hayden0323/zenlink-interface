import { BigNumber } from '@ethersproject/bignumber'
import type { BasePool, BaseToken, MultiRoute, NetworkInfo } from '../entities'
import { Graph, RouteStatus, StablePool, setTokenId } from '../entities'

function isSpecialPool(pool: BasePool): boolean {
  return pool instanceof StablePool
}

function deduplicatePools(pools: BasePool[]): BasePool[] {
  const poolMap = new Map<string, BasePool>()
  pools.forEach((p) => {
    const chId0 = p.token0.chainId || 0
    const chId1 = p.token1.chainId || 0
    const chainInfo = chId0 < chId1 ? `_${chId0}_${chId1}` : `_${chId1}_${chId0}`
    poolMap.set(p.address + chainInfo, p)
  })
  return Array.from(poolMap.values())
}

function breakupSepcialPools(pools: BasePool[]): BasePool[][] {
  const speicalPools = pools.filter(isSpecialPool)
  if (!speicalPools.length)
    return [pools]

  const otherPools = pools.filter(pool => !isSpecialPool(pool))
  const poolsAfterBreakup: BasePool[][] = []
  speicalPools.forEach(p => poolsAfterBreakup.push([...otherPools, p]))

  return poolsAfterBreakup
}

function checkChainId(pools: BasePool[], baseTokenOrNetworks: BaseToken | NetworkInfo[]) {
  if (Array.isArray(baseTokenOrNetworks)) {
    baseTokenOrNetworks.forEach((n) => {
      if (n.chainId !== n.baseToken.chainId)
        throw new Error(`Chain '${n.chainId}' has baseToken with '${n.baseToken.chainId}' that are not the same`)
    })
  }

  const chainIds: (string | number | undefined)[]
    = Array.isArray(baseTokenOrNetworks) ? baseTokenOrNetworks.map(n => n.chainId) : [baseTokenOrNetworks.chainId]
  const chainIdSet = new Set(chainIds)

  const checkToken = (t: BaseToken) => {
    if (!chainIdSet.has(t.chainId)) {
      throw new Error(
        `Token ${t.name}/${t.address} chainId='${t.chainId}' is not in list of possible chains: [${chainIds.join(
          ', ',
        )}]`,
      )
    }
  }

  pools.forEach((p) => {
    checkToken(p.token0)
    checkToken(p.token1)
  })
}

function calcPriceImactWithoutFee(route: MultiRoute): number | undefined {
  if (route.primaryPrice === undefined || route.swapPrice === undefined) {
    return undefined
  }
  else {
    let oneMinusCombinedFee = 1
    route.legs.forEach(l => (oneMinusCombinedFee *= 1 - l.poolFee))
    return Math.max(0, 1 - route.swapPrice / route.primaryPrice / oneMinusCombinedFee)
  }
}

const DEFAULT_FLOW_NUMBER = 12
const MAX_FLOW_NUMBER = 100
function calcBestFlowNumber(bestSingleRoute: MultiRoute, amountIn: BigNumber | number, gasPriceIn?: number): number {
  if (amountIn instanceof BigNumber)
    amountIn = parseInt(amountIn.toString())

  const priceImpact = calcPriceImactWithoutFee(bestSingleRoute)
  if (!priceImpact)
    return DEFAULT_FLOW_NUMBER

  const bestFlowAmount = Math.sqrt((bestSingleRoute.gasSpent * (gasPriceIn || 0) * amountIn) / priceImpact)
  const bestFlowNumber = Math.round(amountIn / bestFlowAmount)
  if (!isFinite(bestFlowNumber))
    return MAX_FLOW_NUMBER

  const realFlowNumber = Math.max(1, Math.min(bestFlowNumber, MAX_FLOW_NUMBER))
  return realFlowNumber
}

function getBetterRouteExactIn(route1: MultiRoute, route2: MultiRoute): number {
  if (route1.status === RouteStatus.NoWay)
    return 1
  if (route2.status === RouteStatus.NoWay)
    return -1
  if (route1.status === RouteStatus.Partial && route2.status === RouteStatus.Success)
    return 1
  if (route2.status === RouteStatus.Partial && route1.status === RouteStatus.Success)
    return -1
  return route1.totalAmountOut > route2.totalAmountOut ? -1 : 1
}

function sortRoutes(routes: MultiRoute[]): MultiRoute[] {
  return routes.sort(getBetterRouteExactIn)
}

export function findMultiRouteExactIn(
  from: BaseToken,
  to: BaseToken,
  amountIn: BigNumber | number,
  pools: BasePool[],
  baseTokenOrNetworks: BaseToken | NetworkInfo[],
  gasPrice?: number,
  flows?: number | number[],
): MultiRoute {
  pools = deduplicatePools(pools)
  checkChainId(pools, baseTokenOrNetworks)
  setTokenId(from, to)

  const poolsAfterBreakup = breakupSepcialPools(pools)
  const routes: MultiRoute[] = []

  poolsAfterBreakup.forEach((pools) => {
    const g = new Graph(pools, from, baseTokenOrNetworks, gasPrice)

    if (flows !== undefined) {
      routes.push(g.findBestRouteExactIn(from, to, amountIn, flows))
    }
    else {
      const outSingle = g.findBestRouteExactIn(from, to, amountIn, 1)
      g.cleanCache()

      const bestFlowNumber = calcBestFlowNumber(outSingle, amountIn, g.getVert(from)?.gasPrice)

      if (bestFlowNumber === 1) {
        routes.push(outSingle)
      }
      else {
        const outMulti = g.findBestRouteExactIn(from, to, amountIn, bestFlowNumber)
        routes.push(sortRoutes([outSingle, outMulti])[0])
      }
    }
  })

  return sortRoutes(routes)[0]
}

