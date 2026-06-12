'use client';
import { useRefWithInit } from '@base-ui/utils/useRefWithInit';
import { unstable_useEnhancedEffect as useIsoLayoutEffect } from '@mui/material/utils';
import { useOnMount } from '@base-ui/utils/useOnMount';
import { useRtl } from '@mui/system/RtlProvider';
import { TreeViewAnyStore } from '../models';

interface ValidTreeViewStoreConstructor<TStore extends TreeViewAnyStore> {
  new (parameters: TStore['parameters']): TStore;
}

export type UseTreeViewStoreParameters<TStore extends TreeViewAnyStore> = Omit<
  Parameters<TStore['updateStateFromParameters']>[0],
  'isRtl'
>;

/**
 * Creates a Tree View store and keep it in sync with the provided parameters.
 */
export function useTreeViewStore<TStore extends TreeViewAnyStore>(
  StoreClass: ValidTreeViewStoreConstructor<TStore>,
  parameters: UseTreeViewStoreParameters<TStore>,
): TStore {
  const isRtl = useRtl();
  const store = useRefWithInit(() => new StoreClass({ ...parameters, isRtl })).current;

  useIsoLayoutEffect(
    () => store.updateStateFromParameters({ ...parameters, isRtl }),
    [store, isRtl, parameters],
  );

  useOnMount(store.disposeEffect);

  return store;
}
