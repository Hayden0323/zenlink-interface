import { useCurrentBlockTimestamp } from '@zenlink-interface/wagmi'
import type { BigNumber } from 'ethers'
import { useMemo } from 'react'

import { useSettings } from '../state/storage'

export const useTransactionDeadline = (chainId: number | undefined, enabled = true) => {
  const { data: blockTimestamp } = useCurrentBlockTimestamp(chainId, enabled)
  const [{ transactionDeadline: ttl }] = useSettings()
  return useMemo(() => {
    if (blockTimestamp && ttl)
      return (blockTimestamp as BigNumber).add(ttl * 60)
  }, [blockTimestamp, chainId, ttl])
}